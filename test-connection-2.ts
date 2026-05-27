import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Checking Firestore access after re-provisioning...");
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.error("Config file not found!");
      return;
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const projectId = config.projectId;
    const dbId = config.firestoreDatabaseId;

    console.log(`Project: ${projectId}, Database ID: ${dbId}`);

    if (getApps().length === 0) {
      initializeApp({ projectId });
    }
    const adminApp = getApps()[0];
    const db = getFirestore(adminApp, dbId);

    console.log("Trying to write to test collection...");
    await db.collection("test").doc("connection").set({
      timestamp: new Date().toISOString(),
      status: "testing_after_provision"
    });
    console.log("Write successful!");

    console.log("Trying to read...");
    const snap = await db.collection("test").doc("connection").get();
    if (snap.exists) {
      console.log("Read successful! Data:", snap.data());
    } else {
      console.log("Document not found!");
    }
  } catch (err: any) {
    console.error("Firestore test failed:", err.message);
  }
}

main();
