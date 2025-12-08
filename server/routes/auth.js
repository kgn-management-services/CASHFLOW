// server/routes/auth.js

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");


const USERS_DB = {
  // --- Admin User ---
  admin: {
    id: "00000000-0000-0000-0000-000000000001",
    username: "admin",
    password: "admin", // Use strong, hashed passwords in production!
    role: "admin",
    market: null, // Admins are not tied to a market
  },

  // --- Market Managers ---
  austin_manager: {
    id: "m001",
    username: "austin_manager",
    password: "password1",
    role: "manager",
    market: "Austin",
  },
  rgv_manager: {
    id: "m002",
    username: "rgv_manager",
    password: "password2",
    role: "manager",
    market: "RGV",
  },
  corpus_manager: {
    id: "m003",
    username: "corpus_manager",
    password: "password3",
    role: "manager",
    market: "CORPUS CHRISTI",
  },
  cali_manager: {
    id: "m004",
    username: "cali_manager",
    password: "password4",
    role: "manager",
    market: "CALIFORNIA",
  },
  vegas_manager: {
    id: "m005",
    username: "vegas_manager",
    password: "password5",
    role: "manager",
    market: "LAS VEGAS",
  },

  // --- New Roles with all-market access ---
  expcomm: {
    id: "r001",
    username: "expcomm",
    password: "pass",
    role: "expense_commission_manager",
    market: null, // all markets
  },
  payrollmgr: {
    id: "r002",
    username: "payrollmgr",
    password: "pass",
    role: "payroll_manager",
    market: null, // all markets
  },
};
// --- End of user database ---

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    // Find the user in our simple database
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
      // The frontend will use this 'user' object to set its initial state.
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
