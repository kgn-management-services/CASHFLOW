// // module.exports = router;
// // routes/expenses.js
// const express = require("express");
// const db = require("../db.js");

// // Robust auth import
// const authModule = require("../middleware/auth");
// const authenticateToken =
//   typeof authModule === "function" ? authModule : authModule.authenticateToken;
// if (typeof authenticateToken !== "function") {
//   throw new Error(
//     "authenticateToken is not a function; check ../middleware/auth export"
//   );
// }

// // Cloudinary + multer (memory) setup
// const multer = require("multer");
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 },
// }); // 10MB
// const cloudinary = require("cloudinary").v2;
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const router = express.Router();

// // Helpers
// function addMarket(where, params, market) {
//   const norm = String(market || "")
//     .trim()
//     .toLowerCase();
//   if (!norm) return { where, params };
//   params.push(norm);
//   where += ` AND LOWER(TRIM(market)) = $${params.length}`;
//   return { where, params };
// }

// function addStore(where, params, store) {
//   const norm = String(store || "")
//     .trim()
//     .toLowerCase();
//   if (!norm) return { where, params };
//   params.push(norm);
//   where += ` AND LOWER(TRIM(store)) = $${params.length}`;
//   return { where, params };
// }

// // Upload file
// router.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file || !req.file.buffer) {
//       return res.status(400).json({ error: "No file" });
//     }
//     const result = await new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         { resource_type: "auto", folder: "expenses" },
//         (err, result) => (err ? reject(err) : resolve(result))
//       );
//       stream.end(req.file.buffer);
//     });
//     return res.status(201).json({ url: result.secure_url });
//   } catch (e) {
//     console.error("cloudinary upload error", e);
//     return res.status(500).json({ error: "Upload failed" });
//   }
// });

// // List with filters
// router.get("/", async (req, res) => {
//   try {
//     const { market, store } = req.query;
//     let params = [];
//     let where = "1=1";
//     ({ where, params } = addMarket(where, params, market));
//     ({ where, params } = addStore(where, params, store));

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
//         unique_id,
//         created_at,
//         audit_status,
//         managername
//       FROM expenses
//       WHERE ${where}
//       ORDER BY expense_date DESC, id DESC
//       LIMIT 5000
//     `;
//     // NOTE: 'managername' above must match the column name in your DB

//     const { rows } = await db.query(sql, params);
//     return res.json(rows);
//   } catch (e) {
//     console.error("GET /api/expenses error", e);
//     return res.status(500).json({ error: "Failed to load expenses" });
//   }
// });

// // By date
// router.get("/by-date", async (req, res) => {
//   try {
//     const date = String(req.query.date || "").trim();
//     const { market, store } = req.query;
//     if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
//       return res.status(400).json({ error: "Invalid date" });
//     }
//     let params = [date];
//     let where = `expense_date = $1`;
//     ({ where, params } = addMarket(where, params, market));
//     ({ where, params } = addStore(where, params, store));

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
//         unique_id,
//         created_at,
//         audit_status,
//         managername
//       FROM expenses
//       WHERE ${where}
//       ORDER BY id DESC
//       LIMIT 5000
//     `;
//     const { rows } = await db.query(sql, params);
//     return res.json(rows);
//   } catch (e) {
//     console.error("GET /api/expenses/by-date error", e);
//     return res.status(500).json({ error: "Failed to load expenses by date" });
//   }
// });

// // Create
// router.post("/", async (req, res) => {
//   try {
//     const {
//       expensedate,
//       market,
//       store,
//       category,
//       amount,
//       uploadurl,
//       comment,
//       status,
//       reason,
//       unique_id,
//       managername, // Reads from Frontend
//     } = req.body;

//     if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expensedate))) {
//       return res.status(400).json({ error: "Invalid expensedate" });
//     }

//     const useAmount =
//       typeof amount === "string"
//         ? amount.trim()
//         : amount == null
//         ? null
//         : String(amount).trim();

//     const valid = new Set(["pending", "approved", "rejected"]);
//     const useStatus =
//       typeof status === "string" && valid.has(status.trim().toLowerCase())
//         ? status.trim().toLowerCase()
//         : null;
//     const useReason = typeof reason === "string" ? reason : null;

//     const providedUnique =
//       typeof unique_id === "string" ? unique_id.trim() : null;
//     const fallbackUnique = `${market || ""}${store || ""}${expensedate || ""}`
//       .replace(/\s+/g, "")
//       .trim();
//     const useUniqueId = providedUnique || fallbackUnique || null;

//     const useManagerName =
//       typeof managername === "string" && managername.trim()
//         ? managername.trim()
//         : null;

//     let sql, params;
//     if (useStatus != null) {
//       sql = `
//         INSERT INTO expenses
//         (expense_date, market, store, category, amount, upload_url, comment, status, reason, unique_id, managername)
//         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
//         RETURNING
//           id,
//           expense_date,
//           market,
//           store,
//           category,
//           amount,
//           upload_url,
//           comment,
//           status,
//           reason,
//           unique_id,
//           created_at,
//           audit_status,
//           managername
//       `;
//       params = [
//         expensedate,
//         market || null,
//         store || null,
//         category || null,
//         useAmount,
//         uploadurl || null,
//         comment || null,
//         useStatus,
//         useReason,
//         useUniqueId,
//         useManagerName,
//       ];
//     } else {
//       sql = `
//         INSERT INTO expenses
//         (expense_date, market, store, category, amount, upload_url, comment, unique_id, managername)
//         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
//         RETURNING
//           id,
//           expense_date,
//           market,
//           store,
//           category,
//           amount,
//           upload_url,
//           comment,
//           status,
//           reason,
//           unique_id,
//           created_at,
//           audit_status,
//           managername
//       `;
//       params = [
//         expensedate,
//         market || null,
//         store || null,
//         category || null,
//         useAmount,
//         uploadurl || null,
//         comment || null,
//         useUniqueId,
//         useManagerName,
//       ];
//     }

//     const { rows } = await db.query(sql, params);
//     return res.status(201).json(rows[0]);
//   } catch (e) {
//     console.error("POST /api/expenses error", e);
//     // If you see "column managername does not exist" in your logs, run the SQL command at the top.
//     return res.status(500).json({ error: "Failed to save expense" });
//   }
// });

// // Grouped by unique (approved + audited only)
// router.get("/grouped-by-unique", authenticateToken, async (req, res) => {
//   try {
//     const { market, store, date_from, date_to } = req.query;
//     let where = "";
//     const params = [];

//     // compulsory filters
//     where += (where ? " AND " : " WHERE ") + "lower(trim(status)) = 'approved'";
//     where +=
//       (where ? " AND " : " WHERE ") + "lower(trim(audit_status)) = 'audited'";

//     if (market) {
//       params.push(String(market).trim().toLowerCase());
//       where +=
//         (where ? " AND " : " WHERE ") +
//         "lower(trim(market)) = $" +
//         params.length;
//     }
//     if (store) {
//       params.push(String(store).trim().toLowerCase());
//       where +=
//         (where ? " AND " : " WHERE ") +
//         "lower(trim(store)) = $" +
//         params.length;
//     }

//     const dFrom = String(date_from || "").trim();
//     if (dFrom && /^\d{4}-\d{2}-\d{2}$/.test(dFrom)) {
//       params.push(dFrom);
//       where +=
//         (where ? " AND " : " WHERE ") + "expense_date >= $" + params.length;
//     }
//     const dTo = String(date_to || "").trim();
//     if (dTo && /^\d{4}-\d{2}-\d{2}$/.test(dTo)) {
//       params.push(dTo);
//       where +=
//         (where ? " AND " : " WHERE ") + "expense_date <= $" + params.length;
//     }

//     const sql = `
//       SELECT
//         unique_id,
//         SUM(
//           COALESCE(
//             CAST(NULLIF(regexp_replace(amount::text, '[^0-9.-]', '', 'g'), '') AS numeric),
//             0.0
//           )
//         ) AS sum_amount,
//         MIN(market) AS market,
//         MIN(store) AS store,
//         MIN(expense_date) AS date
//       FROM expenses
//       ${where}
//       GROUP BY unique_id
//       ORDER BY MIN(expense_date), MIN(market), MIN(store)
//     `;
//     const { rows } = await db.query(sql, params);
//     return res.json(rows);
//   } catch (e) {
//     console.error("grouped expenses error", e);
//     return res.status(500).json({ error: "Failed to load grouped expenses" });
//   }
// });

// module.exports = router;
// routes/expenses.js
const express = require("express");
const db = require("../db.js");

// Robust auth import
const authModule = require("../middleware/auth");
const authenticateToken =
  typeof authModule === "function" ? authModule : authModule.authenticateToken;
if (typeof authenticateToken !== "function") {
  throw new Error(
    "authenticateToken is not a function; check ../middleware/auth export"
  );
}

// Multer (memory) setup
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB

// --- NEW: AWS S3 setup ---
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helpers
function addMarket(where, params, market) {
  const norm = String(market || "")
    .trim()
    .toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  where += ` AND LOWER(TRIM(market)) = $${params.length}`;
  return { where, params };
}

function addStore(where, params, store) {
  const norm = String(store || "")
    .trim()
    .toLowerCase();
  if (!norm) return { where, params };
  params.push(norm);
  where += ` AND LOWER(TRIM(store)) = $${params.length}`;
  return { where, params };
}

const router = express.Router();

// --- UPDATED: Upload file → AWS S3 ---
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No file" });
    }

    const file = req.file;

    // Build a nice key: expenses/<timestamp>-<cleaned-filename>
    const cleanName = file.originalname.replace(/\s+/g, "_");
    const key = `expenses/${Date.now()}-${cleanName}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return res.status(201).json({ url });
  } catch (e) {
    console.error("S3 upload error", e);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// List with filters
router.get("/", async (req, res) => {
  try {
    const { market, store } = req.query;
    let params = [];
    let where = "1=1";
    ({ where, params } = addMarket(where, params, market));
    ({ where, params } = addStore(where, params, store));

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
        unique_id,
        created_at,
        audit_status,
        managername 
      FROM expenses
      WHERE ${where}
      ORDER BY expense_date DESC, id DESC
      LIMIT 5000
    `;

    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (e) {
    console.error("GET /api/expenses error", e);
    return res.status(500).json({ error: "Failed to load expenses" });
  }
});

// By date
router.get("/by-date", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();
    const { market, store } = req.query;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Invalid date" });
    }
    let params = [date];
    let where = `expense_date = $1`;
    ({ where, params } = addMarket(where, params, market));
    ({ where, params } = addStore(where, params, store));

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
        unique_id,
        created_at,
        audit_status,
        managername
      FROM expenses
      WHERE ${where}
      ORDER BY id DESC
      LIMIT 5000
    `;
    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (e) {
    console.error("GET /api/expenses/by-date error", e);
    return res.status(500).json({ error: "Failed to load expenses by date" });
  }
});

// Create
router.post("/", async (req, res) => {
  try {
    const {
      expensedate,
      market,
      store,
      category,
      amount,
      uploadurl,
      comment,
      status,
      reason,
      unique_id,
      managername, // Reads from Frontend
    } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expensedate))) {
      return res.status(400).json({ error: "Invalid expensedate" });
    }

    const useAmount =
      typeof amount === "string"
        ? amount.trim()
        : amount == null
        ? null
        : String(amount).trim();

    const valid = new Set(["pending", "approved", "rejected"]);
    const useStatus =
      typeof status === "string" && valid.has(status.trim().toLowerCase())
        ? status.trim().toLowerCase()
        : null;
    const useReason = typeof reason === "string" ? reason : null;

    const providedUnique =
      typeof unique_id === "string" ? unique_id.trim() : null;
    const fallbackUnique = `${market || ""}${store || ""}${expensedate || ""}`
      .replace(/\s+/g, "")
      .trim();
    const useUniqueId = providedUnique || fallbackUnique || null;

    const useManagerName =
      typeof managername === "string" && managername.trim()
        ? managername.trim()
        : null;

    let sql, params;
    if (useStatus != null) {
      sql = `
        INSERT INTO expenses
        (expense_date, market, store, category, amount, upload_url, comment, status, reason, unique_id, managername)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING
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
          unique_id,
          created_at,
          audit_status,
          managername
      `;
      params = [
        expensedate,
        market || null,
        store || null,
        category || null,
        useAmount,
        uploadurl || null,
        comment || null,
        useStatus,
        useReason,
        useUniqueId,
        useManagerName,
      ];
    } else {
      sql = `
        INSERT INTO expenses
        (expense_date, market, store, category, amount, upload_url, comment, unique_id, managername)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING
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
          unique_id,
          created_at,
          audit_status,
          managername
      `;
      params = [
        expensedate,
        market || null,
        store || null,
        category || null,
        useAmount,
        uploadurl || null,
        comment || null,
        useUniqueId,
        useManagerName,
      ];
    }

    const { rows } = await db.query(sql, params);
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("POST /api/expenses error", e);
    return res.status(500).json({ error: "Failed to save expense" });
  }
});

// Grouped by unique (approved + audited only)
router.get("/grouped-by-unique", authenticateToken, async (req, res) => {
  try {
    const { market, store, date_from, date_to } = req.query;
    let where = "";
    const params = [];

    // compulsory filters
    where += (where ? " AND " : " WHERE ") + "lower(trim(status)) = 'approved'";
    where +=
      (where ? " AND " : " WHERE ") + "lower(trim(audit_status)) = 'audited'";

    if (market) {
      params.push(String(market).trim().toLowerCase());
      where +=
        (where ? " AND " : " WHERE ") +
        "lower(trim(market)) = $" +
        params.length;
    }
    if (store) {
      params.push(String(store).trim().toLowerCase());
      where +=
        (where ? " AND " : " WHERE ") +
        "lower(trim(store)) = $" +
        params.length;
    }

    const dFrom = String(date_from || "").trim();
    if (dFrom && /^\d{4}-\d{2}-\d{2}$/.test(dFrom)) {
      params.push(dFrom);
      where +=
        (where ? " AND " : " WHERE ") + "expense_date >= $" + params.length;
    }
    const dTo = String(date_to || "").trim();
    if (dTo && /^\d{4}-\d{2}-\d{2}$/.test(dTo)) {
      params.push(dTo);
      where +=
        (where ? " AND " : " WHERE ") + "expense_date <= $" + params.length;
    }

    const sql = `
      SELECT
        unique_id,
        SUM(
          COALESCE(
            CAST(NULLIF(regexp_replace(amount::text, '[^0-9.-]', '', 'g'), '') AS numeric),
            0.0
          )
        ) AS sum_amount,
        MIN(market) AS market,
        MIN(store) AS store,
        MIN(expense_date) AS date
      FROM expenses
      ${where}
      GROUP BY unique_id
      ORDER BY MIN(expense_date), MIN(market), MIN(store)
    `;
    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (e) {
    console.error("grouped expenses error", e);
    return res.status(500).json({ error: "Failed to load grouped expenses" });
  }
});

module.exports = router;
