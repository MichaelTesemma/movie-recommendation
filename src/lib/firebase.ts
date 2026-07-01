import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function loadCredentials() {
  const envKey = process.env.FIREBASE_PRIVATE_KEY;
  if (envKey) return JSON.parse(envKey);

  const filePath = path.join(process.cwd(), "firebase-key.json");
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  throw new Error(
    "Firebase credentials not found. Set FIREBASE_PRIVATE_KEY env var " +
    "or place firebase-key.json in the project root."
  );
}

function getApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({ credential: cert(loadCredentials()) });
}

const app = getApp();
export const firestore = getFirestore(app);
