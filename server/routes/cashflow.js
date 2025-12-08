const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");

// Utility to clean currency-like input strings (insert)
function cleanMoney(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t.replace(/[^0-9.\-]/g, "");
}

// For SELECT: safely parse amounts as numeric
const as_numeric = (col) => `
  COALESCE(
    CAST(NULLIF(regexp_replace(${col}::text, '[^0-9.-]', '', 'g'), '') AS numeric),
    0.0
  )::numeric
`;

function addMarket(where, params, market) {
  const norm = String(market || "")
    .trim()
    .toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  const clause = `lower(trim(market)) = $${params.length}`;
  where = where ? `${where} AND ${clause}` : clause;
  return { where, params };
}
function addStore(where, params, storeName) {
  const norm = String(storeName || "")
    .trim()
    .toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  const clause = `lower(trim(store_name)) = $${params.length}`;
  where = where ? `${where} AND ${clause}` : clause;
  return { where, params };
}

// POST /api/cashflow -> insert till row
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      date,
      market,
      store_name,
      cash_at_start,
      cash_at_end,
      carry_forward,
    } = req.body || {};

    // Date and input validation
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    const marketNorm = String(market || "").trim();
    const storeNorm = String(store_name || "").trim();
    if (!marketNorm || !storeNorm) {
      return res
        .status(400)
        .json({ error: "market and store_name are required" });
    }

    const sql = `
      INSERT INTO cashflow (date, market, store_name, cash_at_start, cash_at_end, carry_forward)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        date,
        market,
        store_name,
        ${as_numeric("cash_at_start")} AS cash_at_start,
        ${as_numeric("cash_at_end")}   AS cash_at_end,
        ${as_numeric("carry_forward")} AS carry_forward
    `;
    const params = [
      date,
      marketNorm,
      storeNorm,
      cleanMoney(cash_at_start),
      cleanMoney(cash_at_end),
      cleanMoney(carry_forward),
    ];
    const { rows } = await db.query(sql, params);
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("cashflow insert error:", e);
    return res.status(500).json({ error: "Failed to add till row" });
  }
});

// GET /api/cashflow?market=&store_name= -> list till rows (filters optional)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { market, store_name } = req.query;
    let params = [];
    let where = "";
    ({ where, params } = addMarket(where, params, market));
    ({ where, params } = addStore(where, params, store_name));

    const sql = `
      SELECT
        date,
        market,
        store_name,
        ${as_numeric("cash_at_start")} AS cash_at_start,
        ${as_numeric("cash_at_end")}   AS cash_at_end,
        ${as_numeric("carry_forward")} AS carry_forward
      FROM cashflow
      ${where ? `WHERE ${where}` : ""}
      ORDER BY date DESC, market, store_name
      LIMIT 500
    `;
    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (e) {
    console.error("cashflow list error:", e);
    return res.status(500).json({ error: "Failed to load till data" });
  }
});

module.exports = router;
