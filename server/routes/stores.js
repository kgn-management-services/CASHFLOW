// module.exports = router;
const express = require("express");
const db = require("../db.js");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/adminOnly");
const router = express.Router();

// GET /api/stores?market=hyderabad
router.get("/", authenticateToken, async (req, res) => {
  try {
    const qMarket = (req.query.market || "").trim().toLowerCase();
    const role = (req.user?.role || "").toLowerCase().trim();
    const userMarket = (req.user?.market || "").trim();

    let sql;
    const params = [];

    // FIXED: Add special manager roles to admin access
    const hasAllMarketsAccess =
      isAdmin(role) ||
      role === "expense_commission_manager" ||
      role === "payroll_manager";

    if (hasAllMarketsAccess) {
      // Admin + Special Managers: optional market filter from query, or all stores
      let where =
        "COALESCE(TRIM(MARKET), '') <> '' AND COALESCE(TRIM(STORE), '') <> ''";
      if (qMarket) {
        params.push(qMarket);
        where += ` AND LOWER(TRIM(MARKET)) = $${params.length}`;
      }
      sql = `
        SELECT DISTINCT
          TRIM(STORE) AS code,
          initcap(TRIM(STORE)) AS name,
          initcap(TRIM(MARKET)) AS market
        FROM ALL_INFO
        WHERE ${where}
        ORDER BY initcap(TRIM(STORE))
      `;
    } else if (userMarket) {
      // Plain Manager: force to their market regardless of query param
      params.push(userMarket.toLowerCase());
      sql = `
        SELECT DISTINCT
          TRIM(STORE) AS code,
          initcap(TRIM(STORE)) AS name,
          initcap(TRIM(MARKET)) AS market
        FROM ALL_INFO
        WHERE COALESCE(TRIM(STORE), '') <> ''
        AND LOWER(TRIM(MARKET)) = $1
        ORDER BY initcap(TRIM(STORE))
      `;
    } else {
      // No market on user profile -> no stores
      return res.json([]);
    }

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("stores list error:", e);
    res.status(500).json({ error: "Failed to load stores" });
  }
});

module.exports = router;
