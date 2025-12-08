// server/routes/variance-data.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");

const as_numeric = (col) => `
  COALESCE(
    CAST(NULLIF(regexp_replace(${col}::text, '[^0-9.-]', '', 'g'), '') AS numeric),
    0.0
  )::numeric
`;

function addMarket(where, params, market) {
  if (!market) return { where, params };
  const norm = String(market).trim().toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  const clause = `lower(trim(market)) = $${params.length}`;
  where = where ? `${where} AND ${clause}` : `WHERE ${clause}`;
  return { where, params };
}

function addStore(where, params, store) {
  if (!store) return { where, params };
  const norm = String(store).trim().toLowerCase();
  if (!norm) return { where, params };
  // variance_data uses "store" column; change if your column differs
  params.push(norm);
  const clause = `lower(trim(store)) = $${params.length}`;
  where = where ? `${where} AND ${clause}` : `WHERE ${clause}`;
  return { where, params };
}

// GET /api/variance/all?market=&store=
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const { market, store } = req.query;
    let params = [];
    let where = "";
    ({ where, params } = addMarket(where, params, market));
    ({ where, params } = addStore(where, params, store));

    const sql = `
      SELECT
        date,
        market,
        store,
        dm_name,
        ${as_numeric("Variance_Amount")} AS variance_amount,
        ${as_numeric("resolved_amount")} AS resolved_amount,
        ${as_numeric("pending_amount")}  AS pending_amount,
        reason,
        approved_by,
        status,
        chargeback_per_head,
        responsible_employee_names,
        responsible_employee_ntid,
        back_office_comment,
        audit_by_arjun
      FROM variance_data
      ${where}
      ORDER BY date, market, store
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("variance all error:", e);
    res.status(500).json({ error: "Failed to load variance data" });
  }
});

// GET /api/variance/by-date?date=YYYY-MM-DD&market=&store=
router.get("/by-date", authenticateToken, async (req, res) => {
  try {
    let { date, market, store } = req.query;
    if (typeof date !== "string") date = "";
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !ISO.test(date)) {
      return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    }

    let params = [date];
    let where = `WHERE date = $1`;
    ({ where, params } = addMarket(where, params, market));
    ({ where, params } = addStore(where, params, store));

    const sql = `
      SELECT
        date,
        market,
        store,
        dm_name,
        ${as_numeric("variance_amount")} AS variance_amount,
        ${as_numeric("resolved_amount")} AS resolved_amount,
        ${as_numeric("pending_amount")}  AS pending_amount,
        reason,
        approved_by,
        status,
        chargeback_per_head,
        responsible_employee_names,
        responsible_employee_ntid,
        back_office_comment,
        audit_by_arjun
      FROM variance_data
      ${where}
      ORDER BY store
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("variance by-date error:", e);
    res.status(500).json({ error: "Failed to load variance by date" });
  }
});

module.exports = router;
