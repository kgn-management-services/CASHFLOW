// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Optional prod hardening
const helmet = require("helmet");
const compression = require("compression");
if (process.env.NODE_ENV === "production") {
  app.use(helmet());
  app.use(compression());
}

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORRECTED PATHS ---
// Serve static files from 'public' folder (if you have one)
// app.use(express.static(path.join(__dirname, "public")));

// Initialize DB connection (logs NOW() if successful)
require("./db");

// Root → redirect (if you still have old HTML files)
// app.get("/", (_req, res) => res.redirect("/pages/login.html"));

// Routers
const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);

const adminRouter = require("./routes/admin-data");
app.use("/api/admin", adminRouter);

const varianceRouter = require("./routes/variance-data");
app.use("/api/variance", varianceRouter);

const cashflowRouter = require("./routes/cashflow");
app.use("/api/cashflow", cashflowRouter);

const marketsRouter = require("./routes/markets");
app.use("/api/markets", marketsRouter);

const expensesRouter = require("./routes/expenses");
app.use("/api/expenses", expensesRouter);

const expApprovals = require("./routes/expense-approvals");
app.use("/api/expense-approvals", expApprovals);

const storesRouter = require("./routes/stores");
app.use("/api/stores", storesRouter);

const payrollExpensesRouter = require("./routes/payroll-expenses");
app.use("/api/payroll-expenses", payrollExpensesRouter);
// --- END CORRECTED PATHS ---

// Health
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.listen(PORT, "0.0.0.0", () => console.log(`Server listening on ${PORT}`));
