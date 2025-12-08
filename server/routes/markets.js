// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/adminOnly");

router.get("/all", authenticateToken, async (req, res) => {
  try {
    let sql;
    const params = [];

    // FIXED: Add expense_commission_manager & payroll_manager to "all markets" access
    const role = (req.user?.role || "").toLowerCase().trim();
    const hasAllMarketsAccess =
      isAdmin(role) ||
      role === "expense_commission_manager" ||
      role === "payroll_manager";

    if (req.user && hasAllMarketsAccess) {
      // ADMIN + SPECIAL MANAGERS: Can see all markets
      sql = `
        SELECT DISTINCT initcap(TRIM(market)) AS market
        FROM all_info
        WHERE market IS NOT NULL AND TRIM(market) <> ''
        ORDER BY initcap(TRIM(market))
      `;
    } else if (req.user && req.user.market) {
      // PLAIN MANAGER: Can only see their own market
      params.push(req.user.market.toLowerCase());
      sql = `
        SELECT DISTINCT initcap(TRIM(market)) AS market
        FROM all_info
        WHERE market IS NOT NULL AND LOWER(TRIM(market)) = $1
      `;
    } else {
      // No role or no market? Return nothing.
      return res.json([]);
    }

    const { rows } = await db.query(sql, params);
    res.json(rows.map((r) => r.market));
  } catch (e) {
    console.error("markets list error:", e);
    res.status(500).json({ error: "Failed to load markets" });
  }
});

module.exports = router;
