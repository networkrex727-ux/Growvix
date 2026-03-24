import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

// Check for custom Firebase configuration in localStorage
const customConfigStr = localStorage.getItem('GROWVIX_CUSTOM_FIREBASE');
let firebaseConfig = defaultFirebaseConfig;

if (customConfigStr) {
  try {
    const customConfig = JSON.parse(customConfigStr);
    if (customConfig && customConfig.apiKey && customConfig.projectId) {
      firebaseConfig = { ...defaultFirebaseConfig, ...customConfig };
      console.log('Using custom Firebase configuration from localStorage');
    }
  } catch (e) {
    console.error('Failed to parse custom Firebase config from localStorage', e);
  }
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Validate connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();
