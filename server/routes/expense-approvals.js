// // module.exports = router;
// const express = require("express");
// const db = require("../db.js");
// const router = express.Router();

// // GET /api/expense-approvals
// router.get("/", async (req, res) => {
//   try {
//     const market = (req.query.market || "").trim().toLowerCase();
//     const store = (req.query.store || "").trim().toLowerCase();
//     const date = (req.query.date || "").trim();
//     const status = (req.query.status || "").trim().toLowerCase();
//     const auditStatus = (req.query.audit_status || "").trim().toLowerCase();

//     const params = [];
//     let where = "1=1";

//     if (market) {
//       params.push(market);
//       where += ` AND LOWER(TRIM(market)) = $${params.length}`;
//     }

//     if (store) {
//       params.push(store);
//       where += ` AND LOWER(TRIM(store)) = $${params.length}`;
//     }

//     if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
//       params.push(date);
//       where += ` AND expense_date = $${params.length}`;
//     }

//     if (status && ["pending", "approved", "rejected"].includes(status)) {
//       params.push(status);
//       where += ` AND status = $${params.length}`;
//     }

//     if (auditStatus && ["pending", "audited"].includes(auditStatus)) {
//       params.push(auditStatus);
//       where += ` AND audit_status = $${params.length}`;
//     }

//     // ✅ FIXED: Added 'managername' to the SELECT list below
//     const sql = `
//       SELECT
//         id,
//         expense_date,
//         market,
//         store,
//         category,
//         amount,
//         upload_url,
//         comment,
//         status,
//         reason,
//         audit_status,
//         audit_by,
//         created_at,
//         managername
//       FROM expenses
//       WHERE ${where}
//       ORDER BY expense_date DESC, id DESC
//       LIMIT 5000
//     `;

//     const { rows } = await db.query(sql, params);
//     res.json(rows);
//   } catch (e) {
//     console.error("approvals list error:", e);
//     res.status(500).json({ error: "Failed to load approvals" });
//   }
// });

// // POST /api/expense-approvals/:id/approve
// router.post("/:id/approve", async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const reason = String(req.body?.reason || "").trim();
//     if (!id) return res.status(400).json({ error: "Invalid id" });

//     const sql = `
//       UPDATE expenses
//       SET status='approved', reason=$2
//       WHERE id=$1
//       RETURNING id, status, reason, audit_status, audit_by
//     `;
//     const { rows } = await db.query(sql, [id, reason]);
//     if (!rows.length) return res.status(404).json({ error: "Not found" });
//     res.json(rows[0]);
//   } catch (e) {
//     console.error("approve error:", e);
//     res.status(500).json({ error: "Approve failed" });
//   }
// });

// // POST /api/expense-approvals/:id/reject
// router.post("/:id/reject", async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const reason = String(req.body?.reason || "").trim();
//     if (!id) return res.status(400).json({ error: "Invalid id" });

//     const sql = `
//       UPDATE expenses
//       SET status='rejected', reason=$2
//       WHERE id=$1
//       RETURNING id, status, reason, audit_status, audit_by
//     `;
//     const { rows } = await db.query(sql, [id, reason]);
//     if (!rows.length) return res.status(404).json({ error: "Not found" });
//     res.json(rows[0]);
//   } catch (e) {
//     console.error("reject error:", e);
//     res.status(500).json({ error: "Reject failed" });
//   }
// });

// // POST /api/expense-approvals/:id/audit
// router.post("/:id/audit", async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const auditBy = String(req.body?.audit_by || "").trim();
//     if (!id) return res.status(400).json({ error: "Invalid id" });
//     if (!auditBy)
//       return res.status(400).json({ error: "audit_by is required" });

//     const sql = `
//       UPDATE expenses
//       SET audit_status='audited', audit_by=$2
//       WHERE id=$1
//       RETURNING id, audit_status, audit_by
//     `;
//     const { rows } = await db.query(sql, [id, auditBy]);
//     if (!rows.length) return res.status(404).json({ error: "Not found" });
//     res.json(rows[0]);
//   } catch (e) {
//     console.error("audit error:", e);
//     res.status(500).json({ error: "Audit update failed" });
//   }
// });

// // OPTIONAL: reset audit (useful for re-auditing)
// router.post("/:id/audit-reset", async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ error: "Invalid id" });

//     const sql = `
//       UPDATE expenses
//       SET audit_status='pending', audit_by=''
//       WHERE id=$1
//       RETURNING id, audit_status, audit_by
//     `;
//     const { rows } = await db.query(sql, [id]);
//     if (!rows.length) return res.status(404).json({ error: "Not found" });
//     res.json(rows[0]);
//   } catch (e) {
//     console.error("audit reset error:", e);
//     res.status(500).json({ error: "Audit reset failed" });
//   }
// });

// module.exports = router;
const express = require("express");
const db = require("../db.js");
const router = express.Router();

// GET /api/expense-approvals
router.get("/", async (req, res) => {
  try {
    const market = (req.query.market || "").trim().toLowerCase();
    const store = (req.query.store || "").trim().toLowerCase();
    const date = (req.query.date || "").trim();
    const status = (req.query.status || "").trim().toLowerCase();
    const auditStatus = (req.query.audit_status || "").trim().toLowerCase();

    const params = [];
    let where = "1=1";

    if (market) {
      params.push(market);
      where += ` AND LOWER(TRIM(market)) = $${params.length}`;
    }

    if (store) {
      params.push(store);
      where += ` AND LOWER(TRIM(store)) = $${params.length}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      params.push(date);
      where += ` AND expense_date = $${params.length}`;
    }

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      params.push(status);
      // 🔁 UPDATED: make status filter case-insensitive in SQL as well
      where += ` AND LOWER(TRIM(status)) = $${params.length}`;
    }

    if (auditStatus && ["pending", "audited"].includes(auditStatus)) {
      params.push(auditStatus);
      // 🔁 UPDATED: make audit_status filter case-insensitive in SQL as well
      where += ` AND LOWER(TRIM(audit_status)) = $${params.length}`;
    }

    // ✅ managername is already included
    const sql = `
      SELECT
        id,
        expense_date,
        market,
        store,
        category,
        amount,
        upload_url,
        comment,
        status,
        reason,
        audit_status,
        audit_by,
        created_at,
        managername
      FROM expenses
      WHERE ${where}
      ORDER BY expense_date DESC, id DESC
      LIMIT 5000
    `;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("approvals list error:", e);
    res.status(500).json({ error: "Failed to load approvals" });
  }
});

// POST /api/expense-approvals/:id/approve
router.post("/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const sql = `
      UPDATE expenses
      SET status='approved', reason=$2
      WHERE id=$1
      RETURNING id, status, reason, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id, reason]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("approve error:", e);
    res.status(500).json({ error: "Approve failed" });
  }
});

// POST /api/expense-approvals/:id/reject
router.post("/:id/reject", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const sql = `
      UPDATE expenses
      SET status='rejected', reason=$2
      WHERE id=$1
      RETURNING id, status, reason, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id, reason]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("reject error:", e);
    res.status(500).json({ error: "Reject failed" });
  }
});

// POST /api/expense-approvals/:id/audit
router.post("/:id/audit", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const auditBy = String(req.body?.audit_by || "").trim();
    if (!id) return res.status(400).json({ error: "Invalid id" });
    if (!auditBy)
      return res.status(400).json({ error: "audit_by is required" });

    const sql = `
      UPDATE expenses
      SET audit_status='audited', audit_by=$2
      WHERE id=$1
      RETURNING id, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id, auditBy]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("audit error:", e);
    res.status(500).json({ error: "Audit update failed" });
  }
});

// OPTIONAL: reset audit (useful for re-auditing)
router.post("/:id/audit-reset", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const sql = `
      UPDATE expenses
      SET audit_status='pending', audit_by=''
      WHERE id=$1
      RETURNING id, audit_status, audit_by
    `;
    const { rows } = await db.query(sql, [id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("audit reset error:", e);
    res.status(500).json({ error: "Audit reset failed" });
  }
});

module.exports = router;
