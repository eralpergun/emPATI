
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getDatabase, 
  ref, 
  push, 
  set,
  get,
  remove,
  onValue,
  query,
  limitToLast,
  update
} from "firebase/database";

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyBqrNP1fslPzs641ZqFEXWFC6rgFhP0rg8",
  authDomain: "empatiglobal.firebaseapp.com",
  databaseURL: "https://empatiglobal-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "empatiglobal",
  storageBucket: "empatiglobal.firebasestorage.app",
  messagingSenderId: "871916987115",
  appId: "1:871916987115:web:c734041620ace535c814ae",
  measurementId: "G-32MFMXLEPV"
};

const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0 && firebaseConfig.apiKey !== "YOUR-API-KEY-HERE";

let db: any;
let analytics: any;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    db = getDatabase(app);
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
  }
}

export { db, analytics, ref, push, set, get, remove, onValue, query, limitToLast, isConfigured, update };
