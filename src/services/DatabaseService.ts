import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DatabaseMode, UserProfile, SystemSettings } from '../types';

export class DatabaseService {
  private static mode: DatabaseMode = DatabaseMode.FIREBASE;

  static async init() {
    try {
      const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as SystemSettings;
        this.mode = settings.databaseMode || DatabaseMode.FIREBASE;
      }
    } catch (error) {
      console.error("Failed to init DatabaseService:", error);
    }
  }

  static getMode() {
    return this.mode;
  }

  static async registerUser(profile: UserProfile) {
    if (this.mode === DatabaseMode.SQL) {
      const response = await fetch('/api/sql/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "SQL Registration failed");
      return result;
    } else {
      return await setDoc(doc(db, 'users', profile.uid), profile);
    }
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (this.mode === DatabaseMode.SQL) {
      const response = await fetch(`/api/sql/profile/${uid}`);
      const result = await response.json();
      if (result.success) return result.data;
      return null;
    } else {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) return userDoc.data() as UserProfile;
      return null;
    }
  }

  static async findUserByReferralCode(code: string): Promise<string | null> {
    if (this.mode === DatabaseMode.SQL) {
      // Need a backend route for this
      const response = await fetch(`/api/sql/find-referrer/${code}`);
      const result = await response.json();
      return result.success ? result.uid : null;
    } else {
      const q = query(collection(db, 'users'), where('referralCode', '==', code.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) return querySnapshot.docs[0].id;
      return null;
    }
  }
}
