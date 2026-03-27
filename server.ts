import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let sqlPool: mysql.Pool | null = null;

async function initSql(config: any) {
  try {
    sqlPool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test connection
    const connection = await sqlPool.getConnection();
    console.log("Connected to Remote SQL Database");
    
    // Initialize tables if they don't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        phone VARCHAR(20),
        email VARCHAR(255),
        balance DECIMAL(15, 2) DEFAULT 0,
        depositBalance DECIMAL(15, 2) DEFAULT 0,
        withdrawableBalance DECIMAL(15, 2) DEFAULT 0,
        totalIncome DECIMAL(15, 2) DEFAULT 0,
        todayIncome DECIMAL(15, 2) DEFAULT 0,
        referralCode VARCHAR(50),
        referredBy VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        hasRecharged BOOLEAN DEFAULT FALSE,
        isBanned BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        amount DECIMAL(15, 2),
        type VARCHAR(50),
        status VARCHAR(50),
        paymentMethod VARCHAR(50),
        utr VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(uid)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        price DECIMAL(15, 2),
        dailyIncome DECIMAL(15, 2),
        validityDays INT,
        imageUrl TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        planId VARCHAR(255),
        planName VARCHAR(255),
        dailyIncome DECIMAL(15, 2),
        purchaseDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiryDate TIMESTAMP,
        lastIncomeClaimed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        FOREIGN KEY (userId) REFERENCES users(uid),
        FOREIGN KEY (planId) REFERENCES plans(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(20),
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(uid)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        adminUpi VARCHAR(255),
        websiteUrl VARCHAR(255),
        minWithdrawal DECIMAL(15, 2),
        minRecharge DECIMAL(15, 2),
        withdrawalFee DECIMAL(15, 2),
        supportTelegram VARCHAR(255),
        supportWhatsApp VARCHAR(255),
        supportEmail VARCHAR(255),
        supportChannel VARCHAR(255)
      )
    `);
    
    connection.release();
    return true;
  } catch (error) {
    console.error("SQL Connection Error:", error);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-notification-email", async (req, res) => {
    const { email, subject, message } = req.body;
    if (!resend) {
      return res.json({ success: false, message: "Email service not configured" });
    }
    try {
      const { data, error } = await resend.emails.send({
        from: "Growvix <notifications@growvix.com>",
        to: [email],
        subject: subject,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ff0000;">Growvix Notification</h2>
                <p>${message}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #888;">This is an automated message from Growvix. Please do not reply.</p>
              </div>`,
      });
      if (error) return res.status(400).json({ success: false, error });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Mock API for daily income calculation (In a real app, this would be a cron job or triggered on login)
  app.post("/api/claim-income", (req, res) => {
    // This is a placeholder for server-side logic if needed
    res.json({ success: true, message: "Income claimed successfully" });
  });

  // Database Configuration API
  app.post("/api/admin/config-database", async (req, res) => {
    const { mode, config } = req.body;
    if (mode === 'sql') {
      const success = await initSql(config);
      if (success) {
        res.json({ success: true, message: "SQL Database connected and initialized" });
      } else {
        res.status(500).json({ success: false, message: "Failed to connect to SQL Database" });
      }
    } else {
      sqlPool = null;
      res.json({ success: true, message: "Switched to Firebase Mode" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
