// module.exports = router;
// server/routes/auth.js

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const USERS_DB = {
  // --- System Admin (kept for compatibility) ---
  admin: {
    id: "00000000-0000-0000-0000-000000000001",
    username: "admin",
    password: "admin@7997",
    role: "admin",
    market: null,
  },

  // --- ALL MARKETS (Admins) ---
  "ampcsinc@gmail.com": {
    id: "a001",
    username: "ampcsinc@gmail.com",
    password: "AmG@7721!Pc#", // Anuj Mehra (ALL MARKETS) - admin
    role: "admin",
    market: null,
  },
  "Waqas@ampcsinc.net": {
    id: "a002",
    username: "Waqas@ampcsinc.net",
    password: "Wq@4490!As$", // Waqas Awan (ALL MARKETS) - admin
    role: "admin",
    market: null,
  },
  "BackofficeM@ampcsinc.net": {
    id: "a003",
    username: "BackofficeM@ampcsinc.net",
    password: "BkM@8215!Of#", // Moin Khan (ALL MARKETS) - admin
    role: "admin",
    market: null,
  },

  // --- Market Managers (usernames = company email IDs) ---
  "yasir.muhammad@ampcsinc.net": {
    id: "m001",
    username: "yasir.muhammad@ampcsinc.net",
    password: "Ym@9321!Tx#A",
    role: "manager",
    market: "AUSTIN",
  },

  "alexistrejo@ampcsinc.net": {
    id: "m002",
    username: "alexistrejo@ampcsinc.net",
    password: "Alx@7810!Lp$",
    role: "manager",
    market: "AUSTIN",
  },

  "Mirsaad.iqbal@ampcsinc.net": {
    id: "m003",
    username: "Mirsaad.iqbal@ampcsinc.net",
    password: "MiQ#5529@Rs!",
    role: "manager",
    market: "RGV",
  },

  "Azam.KhanYousafzai@ampcsinc.net": {
    id: "m004",
    username: "Azam.KhanYousafzai@ampcsinc.net",
    password: "AzK@8842!Yf$",
    role: "manager",
    market: "CORPUS CHRISTI",
  },

  "raheman.gotori@ampcsinc.net": {
    id: "m005",
    username: "raheman.gotori@ampcsinc.net",
    password: "Rg@6712!Cm#",
    role: "manager",
    market: "CALIFORNIA",
  },

  "fayahmM@ampcsinc.net": {
    id: "m006",
    username: "fayahmM@ampcsinc.net",
    password: "FyM@9034!Lv$",
    role: "manager",
    market: "LAS VEGAS",
  },

  // --- Other roles with all-market access ---
  expcomm: {
    id: "r001",
    username: "expcomm",
    password: "Arjun@pass@expcomm",
    role: "expense_commission_manager",
    market: null, // all markets
  },
  payrollmgr: {
    id: "r002",
    username: "payrollmgr",
    password: "pass@faisal",
    role: "payroll_manager",
    market: null, // all markets
  },
};
// --- End of user database ---

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    // Lookup by username (we keyed USERS_DB by the username/email)
    const dbUser = USERS_DB[username];

    // Check if user exists and password is correct
    if (dbUser && dbUser.password === password) {
      const userPayload = {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        market: dbUser.market,
      };

      // Sign the token
      const token = jwt.sign(userPayload, process.env.JWT_SECRET, {
        expiresIn: "2h",
      });

      // Return the token AND the user payload
      return res.json({ token, user: userPayload });
    }

    // If no match
    return res.status(401).json({ error: "Invalid credentials" });
  } catch (e) {
    console.error("login error:", e);
    res.status(500).json({ error: "Login failed" });
  }
});

// Token rehydrate endpoint used by front-end guards
router.get("/me", (req, res) => {
  try {
    const hdr = req.headers["authorization"] || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return res.json(user);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

module.exports = router;
