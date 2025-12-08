// server/routes/payroll-expenses.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const pool = db.pool || db;

const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : s);
const sanitizeNumeric = `REGEXP_REPLACE(amount, '[^0-9.\\-]', '', 'g')`;

// GET /api/payroll-expenses?market=&store=&date=&date_from=&date_to=&category=&status=&audit_status=
router.get("/", async (req, res) => {
  try {
    const {
      market,
      store,
      date,
      date_from,
      date_to,
      category,
      status,
      audit_status,
    } = req.query;
    const where = [];
    const params = [];

    if (market) {
      params.push(norm(market));
      where.push(`lower(trim(market)) = $${params.length}`);
    }
    if (store) {
      // Accept '+' as space in case the client sends a plus for spaces
      const storeNorm = (norm(store) || "").replace(/\+/g, " ");
      params.push(storeNorm);
      where.push(`lower(trim(store)) = $${params.length}`);
    }
    if (date) {
      params.push(date);
      where.push(`date = $${params.length}`);
    }
    // Optional date range to reduce payloads
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    if (date_from && ISO.test(String(date_from))) {
      params.push(String(date_from));
      where.push(`date >= $${params.length}`);
    }
    if (date_to && ISO.test(String(date_to))) {
      params.push(String(date_to));
      where.push(`date <= $${params.length}`);
    }

    if (category) {
      const c = norm(category);
      if (c !== "payroll" && c !== "commission") {
        return res.status(400).json({ error: "invalid category" });
      }
      params.push(c);
      where.push(`lower(category) = $${params.length}`);
    }

    const st = status ? norm(status) : "";
    if (["pending", "approved", "rejected"].includes(st)) {
      params.push(st);
      where.push(`status = $${params.length}`);
    }

    const ast = audit_status ? norm(audit_status) : "";
    if (["pending", "audited"].includes(ast)) {
      params.push(ast);
      where.push(`audit_status = $${params.length}`);
    }

    const sql = `
      SELECT
        id, date, market, store, category,
        amount AS amount_text,
        NULLIF(${sanitizeNumeric}, '')::numeric(12,2) AS amount_numeric,
        notes, created_at,
        status, reason,
        audit_status, audit_by,
        unique_id
      FROM payroll_expenses
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY date DESC, id DESC
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/payroll-expenses failed", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/payroll-expenses
router.post("/", async (req, res) => {
  try {
    let { date, market, store, category, amount, notes, unique_id } =
      req.body || {};
    if (!date || !market || !store || !category || typeof amount !== "string") {
      return res
        .status(400)
        .json({ error: "Missing required fields or invalid types" });
    }

    const c = norm(category);
    if (c !== "payroll" && c !== "commission") {
      return res.status(400).json({ error: "Invalid category" });
    }

    const amountText = amount.trim();
    if (amountText === "") {
      return res.status(400).json({ error: "amount cannot be empty" });
    }

    // Compute unique_id if not provided: market + store + date (no spaces)
    const providedUnique =
      typeof unique_id === "string" ? unique_id.trim() : null;
    const fallbackUnique = `${market || ""}${store || ""}${date || ""}`
      .replace(/\s+/g, "")
      .trim();
    const useUniqueId = providedUnique || fallbackUnique || null;

    const sql = `
      INSERT INTO payroll_expenses (
        date, market, store, category, amount, notes, unique_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING
        id, date, market, store, category,
        amount AS amount_text,
        NULLIF(${sanitizeNumeric}, '')::numeric(12,2) AS amount_numeric,
        notes, created_at,
        status, reason,
        audit_status, audit_by,
        unique_id
    `;
    const params = [
      date,
      String(market).trim(),
      String(store).trim(),
      c,
      amountText,
      notes || null,
      useUniqueId,
    ];
    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("POST /api/payroll-expenses failed", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

// POST /api/payroll-expenses/:id/approve
router.post("/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const sql = `
      UPDATE payroll_expenses
      SET status='approved', reason=$2
      WHERE id=$1
      RETURNING id, status, reason, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id, reason]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("payroll approve error:", e);
    res.status(500).json({ error: "Approve failed" });
  }
});

// POST /api/payroll-expenses/:id/reject
router.post("/:id/reject", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const sql = `
      UPDATE payroll_expenses
      SET status='rejected', reason=$2
      WHERE id=$1
      RETURNING id, status, reason, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id, reason]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("payroll reject error:", e);
    res.status(500).json({ error: "Reject failed" });
  }
});

// POST /api/payroll-expenses/:id/audit
router.post("/:id/audit", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const auditBy = String(req.body?.audit_by || "").trim();
    if (!id) return res.status(400).json({ error: "Invalid id" });
    if (!auditBy)
      return res.status(400).json({ error: "audit_by is required" });

    const sql = `
      UPDATE payroll_expenses
      SET audit_status='audited', audit_by=$2
      WHERE id=$1
      RETURNING id, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id, auditBy]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("payroll audit error:", e);
    res.status(500).json({ error: "Audit update failed" });
  }
});

// GET /api/payroll-expenses/grouped-by-unique?market=&store=&date_from=&date_to=&category=
router.get("/grouped-by-unique", async (req, res) => {
  try {
    const { market, store, date_from, date_to, category } = req.query;
    let where = "";
    const params = [];

    // Only approved + audited
    where += (where ? " AND " : " WHERE ") + "lower(trim(status)) = 'approved'";
    where +=
      (where ? " AND " : " WHERE ") + "lower(trim(audit_status)) = 'audited'";

    // Optional category (payroll or commission)
    if (category) {
      const c = norm(category);
      if (c !== "payroll" && c !== "commission") {
        return res.status(400).json({ error: "invalid category" });
      }
      params.push(c);
      where +=
        (where ? " AND " : " WHERE ") + `lower(category) = $${params.length}`;
    }

    if (market) {
      params.push(norm(market));
      where +=
        (where ? " AND " : " WHERE ") +
        `lower(trim(market)) = $${params.length}`;
    }
    if (store) {
      const storeNorm = (norm(store) || "").replace(/\+/g, " ");
      params.push(storeNorm);
      where +=
        (where ? " AND " : " WHERE ") +
        `lower(trim(store)) = $${params.length}`;
    }

    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    if (date_from && ISO.test(String(date_from))) {
      params.push(String(date_from));
      where += (where ? " AND " : " WHERE ") + `date >= $${params.length}`;
    }
    if (date_to && ISO.test(String(date_to))) {
      params.push(String(date_to));
      where += (where ? " AND " : " WHERE ") + `date <= $${params.length}`;
    }

    const sql = `
      SELECT
        unique_id,
        SUM(
          COALESCE(CAST(NULLIF(regexp_replace(amount::text, '[^0-9.-]', '', 'g'), '') AS numeric), 0.0)
        ) AS sum_amount,
        MIN(market) AS market,
        MIN(store)  AS store,
        MIN(date)   AS date
      FROM payroll_expenses
      ${where}
      GROUP BY unique_id
      ORDER BY MIN(date), MIN(market), MIN(store)
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("grouped payroll-expenses error", e);
    res
      .status(500)
      .json({ error: "Failed to load grouped payroll/commission expenses" });
  }
});

module.exports = router;
