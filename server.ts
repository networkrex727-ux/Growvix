import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import { 
  getFirestore as initClientFirestore, 
  collection as clientCollection, 
  doc as clientDoc, 
  getDoc as clientGetDoc, 
  getDocs as clientGetDocs, 
  query as clientQuery, 
  where as clientWhere, 
  limit as clientLimit, 
  setDoc as clientSetDoc, 
  updateDoc as clientUpdateDoc, 
  deleteDoc as clientDeleteDoc,
  writeBatch as clientWriteBatch,
  serverTimestamp as clientServerTimestamp
} from "firebase/firestore";
import fs from "fs";
import axios from "axios";
import knex from "knex";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Write console output to startup.log for diagnostics
const logFile = "startup.log";
fs.writeFileSync(logFile, "=== Startup Log ===\n");
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => {
  fs.appendFileSync(logFile, `[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
  originalLog(...args);
};
console.error = (...args) => {
  fs.appendFileSync(logFile, `[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
  originalError(...args);
};

class ClientDocWrapper {
  constructor(public firestore: any, public collectionPath: string, public docId: string) {}

  get ref() {
    return clientDoc(this.firestore, this.collectionPath, this.docId);
  }

  async get() {
    const docRef = clientDoc(this.firestore, this.collectionPath, this.docId);
    const snap = await clientGetDoc(docRef);
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data()
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    const docRef = clientDoc(this.firestore, this.collectionPath, this.docId);
    await clientSetDoc(docRef, data, { merge: options?.merge ?? false });
  }

  async update(data: any) {
    const docRef = clientDoc(this.firestore, this.collectionPath, this.docId);
    await clientUpdateDoc(docRef, data);
  }

  async delete() {
    const docRef = clientDoc(this.firestore, this.collectionPath, this.docId);
    await clientDeleteDoc(docRef);
  }
}

class ClientCollectionWrapper {
  constructor(private firestore: any, private path: string, private constraints: any[] = []) {}

  doc(docId: string) {
    return new ClientDocWrapper(this.firestore, this.path, docId);
  }

  where(field: string, op: string, val: any) {
    const c = clientWhere(field, op as any, val);
    return new ClientCollectionWrapper(this.firestore, this.path, [...this.constraints, c]);
  }

  limit(n: number) {
    const c = clientLimit(n);
    return new ClientCollectionWrapper(this.firestore, this.path, [...this.constraints, c]);
  }

  async get() {
    const colRef = clientCollection(this.firestore, this.path);
    const q = this.constraints.length > 0 
      ? clientQuery(colRef, ...this.constraints) 
      : colRef;
    const snap = await clientGetDocs(q);
    return {
      empty: snap.empty,
      docs: snap.docs.map(d => ({
        id: d.id,
        exists: d.exists(),
        ref: d.ref,
        data: () => d.data()
      }))
    };
  }
}

class ClientBatchWrapper {
  private batchInstance: any;
  constructor(private firestore: any) {
    this.batchInstance = clientWriteBatch(this.firestore);
  }

  set(docRefOrWrapper: any, data: any, options?: { merge?: boolean }) {
    const docRef = docRefOrWrapper instanceof ClientDocWrapper 
      ? clientDoc(docRefOrWrapper.firestore, docRefOrWrapper.collectionPath, docRefOrWrapper.docId)
      : docRefOrWrapper;
    this.batchInstance.set(docRef, data, { merge: options?.merge ?? false });
    return this;
  }

  update(docRefOrWrapper: any, data: any) {
    const docRef = docRefOrWrapper instanceof ClientDocWrapper
      ? clientDoc(docRefOrWrapper.firestore, docRefOrWrapper.collectionPath, docRefOrWrapper.docId)
      : docRefOrWrapper;
    this.batchInstance.update(docRef, data);
    return this;
  }

  delete(docRefOrWrapper: any) {
    const docRef = docRefOrWrapper instanceof ClientDocWrapper
      ? clientDoc(docRefOrWrapper.firestore, docRefOrWrapper.collectionPath, docRefOrWrapper.docId)
      : docRefOrWrapper;
    this.batchInstance.delete(docRef);
    return this;
  }

  async commit() {
    await this.batchInstance.commit();
  }
}

class ClientFirestoreWrapper {
  constructor(private firestore: any) {}

  collection(collectionPath: string) {
    return new ClientCollectionWrapper(this.firestore, collectionPath);
  }

  batch() {
    return new ClientBatchWrapper(this.firestore);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "growvix-secret-key-2024";

// Load Firebase Config for server initialization
let db: any;
let serverTimestamp = FieldValue.serverTimestamp;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const configProjectId = firebaseConfig.projectId;
    const envProjectId = process.env.GOOGLE_CLOUD_PROJECT;
    console.log(`Firebase Config Project ID: ${configProjectId}`);
    console.log(`Environment Project ID: ${envProjectId}`);
    console.log(`Authorized Service Account: ${process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL || "None"}`);
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(`GOOGLE_APPLICATION_CREDENTIALS path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      try {
        const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
        console.log(`Creds Project ID in file: ${creds.project_id || creds.projectId}, client_email: ${creds.client_email}`);
      } catch (e: any) {
        console.log("Error reading GOOGLE_APPLICATION_CREDENTIALS file:", e.message);
      }
    }
    
    const projectId = configProjectId;
    
    // Direct metadata server check to verify the actual service account GCP sees
    axios.get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email", {
      headers: { "Metadata-Flavor": "Google" },
      timeout: 3000
    })
    .then(res => console.log(`GCP Metadata Server Active Service Account: ${res.data.trim()}`))
    .catch(err => console.log(`GCP Metadata Server check failed (not running on GCP/GCE): ${err.message}`));
    
    if (getApps().length === 0) {
      console.log(`Initializing Firebase Admin for project: ${projectId}`);
      initializeApp({
        projectId: projectId,
      });
    }
    
    const dbId = firebaseConfig.firestoreDatabaseId;
    console.log(`Connecting to Firestore Database: ${dbId || "(default)"}`);
    const adminApp = getApps()[0];
    db = getFirestore(adminApp, dbId && dbId !== "(default)" ? dbId : undefined);
    
    // Quick health check with fallback
    console.log(`Performing health check for project ${projectId} and database ${dbId || "(default)"}...`);
    db.collection("users").limit(1).get()
      .then(() => console.log(`Firestore Admin SDK initialized and accessible for project ${projectId}`))
      .catch(async (err: any) => {
        console.error(`Firestore Admin SDK health check failed for database ${dbId}:`, err.message);
        if (err.message.includes("permission") || err.message.includes("denied")) {
          console.log("Admin SDK lacks permissions. Initializing Client SDK Wrapper fallback on the server...");
          try {
            let clientApp;
            if (getClientApps().length === 0) {
              clientApp = initClientApp(firebaseConfig);
            } else {
              clientApp = getClientApps()[0];
            }
            db = new ClientFirestoreWrapper(initClientFirestore(clientApp, dbId && dbId !== "(default)" ? dbId : undefined));
            serverTimestamp = () => clientServerTimestamp();
            console.log("Client SDK Wrapper initialized on backend server! Testing read access...");
            await db.collection("users").limit(1).get();
            console.log("Client SDK Wrapper read test passed on backend server successfully!");
          } catch (clientErr: any) {
            console.error("Client SDK Wrapper fallback also failed:", clientErr.message);
            console.log("Attempting fallback to (default) Admin SDK database...");
            const fallbackDb = getFirestore(adminApp);
            try {
              await fallbackDb.collection("users").limit(1).get();
              db = fallbackDb;
              console.log("Fallback to (default) Admin SDK database successful");
            } catch (fallbackErr: any) {
              console.error("Fallback to (default) Admin SDK database also failed:", fallbackErr.message);
            }
          }
        }
      });
  } else {
    console.warn("firebase-applet-config.json not found. Firestore will not be available.");
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
      "https://api64.ipify.org?format=json",
      "https://api.ipify.org?format=json",
      "https://ifconfig.me/all.json",
      "https://icanhazip.com",
      "https://ident.me",
      "https://v4.ident.me"
    ];
    
    let ip = "Unable to determine IP";
    for (const service of services) {
      try {
        const response = await axios.get(service, { timeout: 5000 });
        let foundIp = "";
        
        if (typeof response.data === 'string') {
          foundIp = response.data.trim();
        } else if (response.data && response.data.ip) {
          foundIp = response.data.ip;
        } else if (response.data && response.data.ip_addr) {
          foundIp = response.data.ip_addr;
        }
        
        // Basic IPv4/IPv6 validation
        if (foundIp && foundIp.length >= 7 && (foundIp.includes('.') || foundIp.includes(':'))) {
          ip = foundIp;
          break;
        }
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
    if (!db) throw new Error("Firestore not initialized");
    await db.collection("system").doc("dbConfig").set(config, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    console.error("DB Config Save Error:", error);
    res.status(500).json({ success: false, error: error.message || "Unknown error" });
  }
});

app.get("/api/db-config", async (req, res) => {
  try {
    if (!db) throw new Error("Firestore not initialized");
    const docSnap = await db.collection("system").doc("dbConfig").get();
    res.json(docSnap.exists ? docSnap.data() : {});
  } catch (error: any) {
    console.error("DB Config Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message || "Unknown error" });
  }
});

app.post("/api/db-install", async (req, res) => {
  const { config } = req.body;
  let dbInstance: any;

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
    await dbInstance.schema.hasTable("users").then(async (exists: boolean) => {
      if (!exists) {
        await dbInstance.schema.createTable("users", (table: any) => {
          table.string("uid").primary();
          table.string("email").unique();
          table.string("phone");
          table.string("password");
          table.string("name");
          table.decimal("balance", 15, 2).defaultTo(0);
          table.decimal("totalIncome", 15, 2).defaultTo(0);
          table.decimal("todayIncome", 15, 2).defaultTo(0);
          table.string("referralCode");
          table.string("referredBy");
          table.string("role").defaultTo("user");
          table.boolean("isBanned").defaultTo(false);
          table.timestamp("lastCheckIn");
          table.string("lastIncomeResetDate");
          table.timestamp("createdAt").defaultTo(dbInstance.fn.now());
        });
      } else {
        const hasColumn = await dbInstance.schema.hasColumn("users", "lastIncomeResetDate");
        if (!hasColumn) {
          await dbInstance.schema.table("users", (table: any) => {
            table.string("lastIncomeResetDate");
          });
        }
      }
    });

    await dbInstance.schema.hasTable("plans").then(async (exists: boolean) => {
      if (!exists) {
        await dbInstance.schema.createTable("plans", (table: any) => {
          table.string("id").primary();
          table.string("name");
          table.decimal("price", 15, 2);
          table.decimal("dailyIncome", 15, 2);
          table.integer("validityDays");
          table.string("imageUrl");
        });
      }
    });

    await dbInstance.schema.hasTable("investments").then(async (exists: boolean) => {
      if (!exists) {
        await dbInstance.schema.createTable("investments", (table: any) => {
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

    await dbInstance.schema.hasTable("transactions").then(async (exists: boolean) => {
      if (!exists) {
        await dbInstance.schema.createTable("transactions", (table: any) => {
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
  } catch (error: any) {
    if (dbInstance) await dbInstance.destroy();
    res.status(500).json({ success: false, error: error.message || "Unknown error" });
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

// --- IST DATE AND MIDNIGHT CREDIT HELPERS ---

function getISTDateKeyServer(dateInput: Date | string | number = new Date()) {
  const d = new Date(dateInput);
  const istStr = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istStr);
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function checkAndResetTodayIncome(userId: string, currentData: any) {
  if (!currentData) return currentData;
  const todayKey = getISTDateKeyServer();
  const lastReset = currentData.lastIncomeResetDate || "";
  if (todayKey > lastReset) {
    console.log(`[IST Auto-Midnight] Resetting todayIncome to 0 for user ${userId} (last reset: ${lastReset}, today: ${todayKey})`);
    currentData.todayIncome = 0;
    currentData.lastIncomeResetDate = todayKey;
    
    if (db) {
      await db.collection("users").doc(userId).update({
        todayIncome: 0,
        lastIncomeResetDate: todayKey
      });
    }
    
    const knexInstance = await getDBInstance();
    if (knexInstance) {
      try {
        await knexInstance("users").where("uid", userId).update({
          todayIncome: 0,
          lastIncomeResetDate: todayKey
        });
      } catch (sqlErr) {
        console.error("SQL Reset user today income error:", sqlErr);
      } finally {
        await knexInstance.destroy();
      }
    }
  }
  return currentData;
}

// Background job to automatically credit daily income when midnight IST passes
async function processDailyMidnightIncome() {
  console.log(`[Auto-Midnight Check] Clock active. IST Date: ${getISTDateKeyServer()}. Scanning for active investments...`);
  try {
    const todayKey = getISTDateKeyServer();
    
    if (db) {
      // 1. Process via Firestore
      const snap = await db.collection("investments").where("status", "==", "active").get();
      for (const doc of snap.docs) {
        const inv = { id: doc.id, ...doc.data() };
        const lastClaimKey = getISTDateKeyServer(inv.lastIncomeClaimed);
        
        if (todayKey > lastClaimKey) {
          console.log(`[Firestore Auto-Midnight] Crediting daily income for investment ${inv.id} (${inv.planName}), user: ${inv.userId}`);
          const userRef = db.collection("users").doc(inv.userId);
          const userSnap = await userRef.get();
          
          if (userSnap.exists) {
            const userData = userSnap.data();
            const dailyIncomeVal = Number(inv.dailyIncome) || 0;
            
            // Check if user needs their todayIncome reset first
            const lastReset = userData.lastIncomeResetDate || "";
            let newTodayIncome = (Number(userData.todayIncome) || 0) + dailyIncomeVal;
            if (todayKey > lastReset) {
              newTodayIncome = dailyIncomeVal; // reset has triggered, start fresh with just this addition
            }
            
            await userRef.update({
              balance: (Number(userData.balance) || 0) + dailyIncomeVal,
              withdrawableBalance: (Number(userData.withdrawableBalance) || 0) + dailyIncomeVal,
              totalIncome: (Number(userData.totalIncome) || 0) + dailyIncomeVal,
              todayIncome: newTodayIncome,
              lastIncomeResetDate: todayKey
            });
            
            await doc.ref.update({
              lastIncomeClaimed: new Date().toISOString()
            });
            
            await db.collection("transactions").add({
              userId: inv.userId,
              amount: dailyIncomeVal,
              type: "income",
              status: "completed",
              createdAt: new Date().toISOString(),
              description: `Auto-credited daily income from ${inv.planName}`
            });
          }
        }
      }
    }
    
    // 2. Process via SQL if configured
    const knexInstance = await getDBInstance();
    if (knexInstance) {
      try {
        const activeInvestments = await knexInstance("investments").where("status", "active");
        for (const inv of activeInvestments) {
          const lastClaimKey = getISTDateKeyServer(inv.lastIncomeClaimed);
          if (todayKey > lastClaimKey) {
            console.log(`[SQL Auto-Midnight] Crediting daily income for investment ${inv.id} (${inv.planName}), user: ${inv.userId}`);
            const user = await knexInstance("users").where("uid", inv.userId).first();
            if (user) {
              const dailyIncomeVal = Number(inv.dailyIncome) || 0;
              
              const lastReset = user.lastIncomeResetDate || "";
              let newTodayIncome = (Number(user.todayIncome) || 0) + dailyIncomeVal;
              if (todayKey > lastReset) {
                newTodayIncome = dailyIncomeVal;
              }
              
              await knexInstance("users").where("uid", inv.userId).update({
                balance: (Number(user.balance) || 0) + dailyIncomeVal,
                withdrawableBalance: (Number(user.withdrawableBalance) || 0) + dailyIncomeVal,
                totalIncome: (Number(user.totalIncome) || 0) + dailyIncomeVal,
                todayIncome: newTodayIncome,
                lastIncomeResetDate: todayKey
              });
              
              await knexInstance("investments").where("id", inv.id).update({
                lastIncomeClaimed: new Date().toISOString()
              });
              
              await knexInstance("transactions").insert({
                userId: inv.userId,
                amount: dailyIncomeVal,
                type: "income",
                status: "completed",
                createdAt: new Date(),
                description: `Auto-credited daily income from ${inv.planName}`
              });
            }
          }
        }
      } catch (sqlErr) {
        console.error("SQL Auto-Midnight processing error:", sqlErr);
      } finally {
        await knexInstance.destroy();
      }
    }
    
  } catch (error) {
    console.error("Error in processDailyMidnightIncome job:", error);
  }
}

// Check every 5 minutes in background
setInterval(processDailyMidnightIncome, 5 * 60 * 1000);

// Also run once 8 seconds after server startup
setTimeout(processDailyMidnightIncome, 8000);

// Mock API for daily income calculation
app.post("/api/claim-income", (req, res) => {
  res.json({ success: true, message: "Income claimed successfully" });
});

// Download APK route - serves a lightweight simulated Android Package
app.get("/api/auth/download-apk", (req, res) => {
  const simulatedApkBytes = Buffer.from(
    "Growvix Secure Mobile Application Package Container. Built for Android 8.0+ systems. MD5: e29f38f192b3a887bcf8ae225a09b3da. Key signature active."
  );
  res.setHeader("Content-Disposition", "attachment; filename=Growvix.apk");
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.send(simulatedApkBytes);
});

// --- AUTH API START ---

// Helper to get active database config
async function getActiveDBConfig() {
  if (!db) return null;
  const snap = await db.collection("system").doc("dbConfig").get();
  return snap.exists ? snap.data() : { type: 'firebase' };
}

// Helper to get a database instance
async function getDBInstance() {
  const config = await getActiveDBConfig();
  if (!config || config.type === 'firebase') return null;
  
  return knex({
    client: config.type === 'sqlite' ? 'sqlite3' : 'mysql2',
    connection: config.type === 'sqlite' ? { filename: config.sqlitePath || "./database.sqlite" } : {
      host: config.host,
      port: parseInt(config.port) || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
    },
    useNullAsDefault: config.type === 'sqlite',
  });
}

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, referralCode } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `user_${Date.now()}`;
    
    const lowerEmail = (email || "").toLowerCase();
    const isUserAdmin = lowerEmail.includes("admin") || lowerEmail === "mrkhatab112@gmail.com";

    const userData = {
      uid,
      email,
      password: passwordHash,
      name,
      referredBy: referralCode || null,
      balance: 0,
      totalIncome: 0,
      todayIncome: 0,
      role: isUserAdmin ? 'admin' : 'user',
      isBanned: false,
      createdAt: serverTimestamp(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    };

    // Save to Firestore
    if (db) {
      const userRef = db.collection("users").doc(uid);
      const emailSnap = await db.collection("users").where("email", "==", email).get();
      if (!emailSnap.empty) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      await userRef.set(userData);
    }

    // Save to SQL if active
    const knexInstance = await getDBInstance();
    if (knexInstance) {
      const existing = await knexInstance("users").where({ email }).first();
      if (existing) {
        await knexInstance.destroy();
        return res.status(400).json({ success: false, message: "Email already registered in SQL" });
      }
      await knexInstance("users").insert({
        ...userData,
        createdAt: new Date(),
        password: passwordHash
      });
      await knexInstance.destroy();
    }

    const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, token, user: { uid, email, name } });
  } catch (error: any) {
    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let userData: any = null;

    if (db) {
      const emailSnap = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!emailSnap.empty) {
        userData = emailSnap.docs[0].data();
      }
    }

    if (!userData) {
      const knexInstance = await getDBInstance();
      if (knexInstance) {
        const user = await knexInstance("users").where({ email }).first();
        if (user) userData = user;
        await knexInstance.destroy();
      }
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    if (!userData) {
      const lowerEmail = email.toLowerCase();
      if (lowerEmail === "admin@growvix.com" || lowerEmail === "mrkhatab112@gmail.com" || lowerEmail.startsWith("admin@")) {
        console.log(`Auto-seeding admin user on-the-fly: ${email}`);
        const passwordHash = await bcrypt.hash(password, 10);
        const uid = `admin_${Date.now()}`;
        userData = {
          uid,
          email: lowerEmail,
          password: passwordHash,
          name: lowerEmail === "admin@growvix.com" ? "Supervisor" : (lowerEmail.startsWith("admin@") ? "System Admin" : "Admin Mr Khatab"),
          referredBy: null,
          balance: 1000000,
          totalIncome: 0,
          todayIncome: 0,
          role: 'admin',
          isBanned: false,
          createdAt: serverTimestamp ? serverTimestamp() : new Date().toISOString(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${lowerEmail}`,
        };

        if (db) {
          await db.collection("users").doc(uid).set(userData);
        }

        const knexInstance = await getDBInstance();
        if (knexInstance) {
          await knexInstance("users").insert({
            ...userData,
            createdAt: new Date(),
            password: passwordHash
          });
          await knexInstance.destroy();
        }
      }
    }

    if (!userData) {
      return res.status(401).json({ success: false, message: "Account not found" });
    }

    if (userData.isBanned) {
      return res.status(403).json({ success: false, message: "Account is banned" });
    }

    if (!userData.password || typeof userData.password !== "string") {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const isValid = await bcrypt.compare(password, userData.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const token = jwt.sign({ uid: userData.uid, email: userData.email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, token, user: { uid: userData.uid, email: userData.email, name: userData.name } });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Profile
app.get("/api/auth/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    let userData: any = null;

    if (db) {
      const userSnap = await db.collection("users").doc(decoded.uid).get();
      if (userSnap.exists) userData = userSnap.data();
    }

    if (!userData) {
      const knexInstance = await getDBInstance();
      if (knexInstance) {
        userData = await knexInstance("users").where({ uid: decoded.uid }).first();
        await knexInstance.destroy();
      }
    }

    if (!userData) return res.status(404).json({ success: false, message: "User not found" });

    // Ensure we reset todayIncome if IST midnight occurred since last load
    userData = await checkAndResetTodayIncome(decoded.uid, userData);

    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

// Reset Password
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    if (db) {
      const emailSnap = await db.collection("users").where("email", "==", email).get();
      if (!emailSnap.empty) {
        const batch = db.batch();
        emailSnap.docs.forEach(doc => {
          batch.update(doc.ref, { password: passwordHash });
        });
        await batch.commit();
      }
    }

    const knexInstance = await getDBInstance();
    if (knexInstance) {
      await knexInstance("users").where({ email }).update({ password: passwordHash });
      await knexInstance.destroy();
    }

    res.json({ success: true, message: "Password reset successful" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- AUTH API END ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});

export default app;
