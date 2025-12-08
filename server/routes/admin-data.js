// server/routes/admin-data.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// --- Robust Auth Import (matches expenses.js pattern) ---
const authModule = require("../middleware/auth");
const authenticateToken =
  typeof authModule === "function" ? authModule : authModule.authenticateToken;
if (typeof authenticateToken !== "function") {
  throw new Error(
    "authenticateToken is not a function; check ../middleware/auth export"
  );
}

// Optional: robust admin import (not used below but kept for parity)
const adminModule = require("../middleware/adminOnly");
const adminOnly =
  typeof adminModule === "function" ? adminModule : adminModule?.adminOnly;

const as_numeric = (col) => `
  COALESCE(
    CAST(NULLIF(regexp_replace(${col}::text, '[^0-9.-]', '', 'g'), '') AS numeric),
    0.0
  )::numeric
`;

function toChicagoDateString(input) {
  const d = input instanceof Date ? input : new Date(input || Date.now());
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addMarketFilter(where, params, market) {
  if (!market) return { where, params };
  const norm = String(market).trim().toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  const clause = `lower(trim(market)) = $${params.length}`;
  where = where ? `${where} AND ${clause}` : clause;
  return { where, params };
}

function addStoreFilter(where, params, store) {
  if (!store) return { where, params };
  const norm = String(store).trim().toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  // Store filter matches store_id in pos_data
  const clause = `lower(trim(store_id)) = $${params.length}`;
  where = where ? `${where} AND ${clause}` : clause;
  return { where, params };
}

// GET /api/admin/sales/all?market=&store=&date_from=&date_to=
// date_from/date_to are optional ISO YYYY-MM-DD boundaries to reduce payloads
router.get("/sales/all", authenticateToken, async (req, res) => {
  try {
    const { market, store, date_from, date_to } = req.query;
    let params = [];
    let where = "";

    ({ where, params } = addMarketFilter(where, params, market));
    ({ where, params } = addStoreFilter(where, params, store));

    // Optional date window
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    if (date_from && ISO_DATE_RE.test(String(date_from))) {
      params.push(String(date_from));
      where = where
        ? `${where} AND date >= $${params.length}`
        : `date >= $${params.length}`;
    }
    if (date_to && ISO_DATE_RE.test(String(date_to))) {
      params.push(String(date_to));
      where = where
        ? `${where} AND date <= $${params.length}`
        : `date <= $${params.length}`;
    }

    // ✅ ADDED CashinBank below
    const sql = `
      SELECT
        date,
        market,
        store_id,
        ${as_numeric("pos_cash")}      AS pos_cash,
        ${as_numeric("pos_debit")}     AS pos_debit,
        ${as_numeric("qpay_payment")}  AS qpay_payment,
        ${as_numeric("CashinBank")}    AS cashinbank, 
        unique_id
      FROM pos_data
      ${where ? `WHERE ${where}` : ""}
      ORDER BY date, market, store_id
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("sales all error:", e);
    res.status(500).json({ error: "Failed to load all sales" });
  }
});

// GET /api/admin/sales/by-date?date=YYYY-MM-DD&market=&store=
router.get("/sales/by-date", authenticateToken, async (req, res) => {
  try {
    let { date, market, store } = req.query;

    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof date !== "string" || !ISO_DATE_RE.test(date)) {
      // Attempt to coerce to Chicago date string (YYYY-MM-DD), then validate
      const coerced = toChicagoDateString(date);
      if (!coerced || !ISO_DATE_RE.test(coerced)) {
        return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
      }
      date = coerced;
    }

    let params = [date];
    let where = `date = $1`;

    ({ where, params } = addMarketFilter(where, params, market));
    ({ where, params } = addStoreFilter(where, params, store));

    // ✅ ADDED CashinBank below
    const sql = `
      SELECT
        date,
        market,
        store_id,
        ${as_numeric("pos_cash")}      AS pos_cash,
        ${as_numeric("pos_debit")}     AS pos_debit,
        ${as_numeric("qpay_payment")}  AS qpay_payment,
        ${as_numeric("CashinBank")}    AS cashinbank,
        unique_id
      FROM pos_data
      ${where ? `WHERE ${where}` : ""}
      ORDER BY date, market, store_id
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("sales by-date error:", e);
    res.status(500).json({ error: "Failed to load sales by date" });
  }
});

module.exports = router;
