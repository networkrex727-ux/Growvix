import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config for server initialization
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
