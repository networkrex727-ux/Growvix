import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import * as admin from "firebase-admin";
import fs from "fs";
import axios from "axios";
import knex from "knex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config for server initialization
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
// If a specific database ID is provided, we should use it. 
// Note: In firebase-admin, you can't easily switch databaseId on the fly without getFirestore() from 'firebase-admin/firestore'
// But for AI Studio, the default project firestore is usually what's used.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/server-info", async (req, res) => {
    try {
      const services = [
        "https://api.ipify.org?format=json",
        "https://ifconfig.me/all.json",
        "https://icanhazip.com"
      ];
      
      let ip = "Unable to determine IP";
      for (const service of services) {
        try {
          const response = await axios.get(service, { timeout: 3000 });
          if (typeof response.data === 'string') {
            ip = response.data.trim();
          } else if (response.data && response.data.ip) {
            ip = response.data.ip;
          } else if (response.data && response.data.ip_addr) {
            ip = response.data.ip_addr;
          }
          if (ip && ip !== "Unable to determine IP" && ip.split('.').length === 4) break;
        } catch (e) {
          continue;
        }
      }
      res.json({ ip });
    } catch (error) {
      console.error("Server Info Error:", error);
      res.json({ ip: "Unable to determine IP" });
    }
  });

  app.post("/api/db-config", async (req, res) => {
    const { config } = req.body;
    try {
      await db.collection("system").doc("dbConfig").set(config, { merge: true });
      res.json({ success: true });
    } catch (error: any) {
      console.error("DB Config Save Error:", error);
      res.status(500).json({ success: false, error: error.message || "Unknown error" });
    }
  });

  app.get("/api/db-config", async (req, res) => {
    try {
      const docSnap = await db.collection("system").doc("dbConfig").get();
      res.json(docSnap.exists ? docSnap.data() : {});
    } catch (error: any) {
      console.error("DB Config Fetch Error:", error);
      res.status(500).json({ success: false, error: error.message || "Unknown error" });
    }
  });

  app.post("/api/db-install", async (req, res) => {
    const { config } = req.body;
    let dbInstance;

    try {
      if (config.type === "sqlite") {
        dbInstance = knex({
          client: "sqlite3",
          connection: { filename: config.sqlitePath || "./database.sqlite" },
          useNullAsDefault: true,
        });
      } else if (config.type === "mysql") {
        dbInstance = knex({
          client: "mysql2",
          connection: {
            host: config.host,
            port: parseInt(config.port) || 3306,
            user: config.user,
            password: config.password,
            database: config.database,
            connectTimeout: 10000,
          },
        });
      } else {
        return res.status(400).json({ success: false, message: "Invalid database type" });
      }

      // Test connection
      await dbInstance.raw('select 1+1 as result');

      // Create Tables
      await dbInstance.schema.hasTable("users").then(async (exists) => {
        if (!exists) {
          await dbInstance.schema.createTable("users", (table) => {
            table.string("uid").primary();
            table.string("phone");
            table.string("email");
            table.decimal("balance", 15, 2).defaultTo(0);
            table.decimal("totalIncome", 15, 2).defaultTo(0);
            table.decimal("todayIncome", 15, 2).defaultTo(0);
            table.string("referralCode");
            table.string("referredBy");
            table.string("role").defaultTo("user");
            table.timestamp("lastCheckIn");
            table.timestamp("createdAt").defaultTo(dbInstance.fn.now());
          });
        }
      });

      await dbInstance.schema.hasTable("plans").then(async (exists) => {
        if (!exists) {
          await dbInstance.schema.createTable("plans", (table) => {
            table.string("id").primary();
            table.string("name");
            table.decimal("price", 15, 2);
            table.decimal("dailyIncome", 15, 2);
            table.integer("validityDays");
            table.string("imageUrl");
          });
        }
      });

      await dbInstance.schema.hasTable("investments").then(async (exists) => {
        if (!exists) {
          await dbInstance.schema.createTable("investments", (table) => {
            table.increments("id").primary();
            table.string("userId");
            table.string("planId");
            table.string("planName");
            table.decimal("dailyIncome", 15, 2);
            table.timestamp("purchaseDate");
            table.timestamp("expiryDate");
            table.timestamp("lastIncomeClaimed");
            table.string("status");
            table.timestamp("createdAt").defaultTo(dbInstance.fn.now());
          });
        }
      });

      await dbInstance.schema.hasTable("transactions").then(async (exists) => {
        if (!exists) {
          await dbInstance.schema.createTable("transactions", (table) => {
            table.increments("id").primary();
            table.string("userId");
            table.decimal("amount", 15, 2);
            table.string("type");
            table.string("status");
            table.string("utr");
            table.string("paymentMethod");
            table.text("description");
            table.timestamp("createdAt").defaultTo(dbInstance.fn.now());
          });
        }
      });

      await dbInstance.destroy();
      res.json({ success: true, message: "Tables installed successfully" });
    } catch (error) {
      if (dbInstance) await dbInstance.destroy();
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
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
