
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  enableIndexedDbPersistence, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";

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

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    // Connection issues often stem from WebSockets being blocked. 
    // experimentalForceLongPolling can solve "Could not reach Cloud Firestore backend" errors.
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });

    // Enable offline persistence for better UX when connection is lost
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: multiple tabs open");
      } else if (err.code === 'unimplemented') {
        console.warn("Persistence not supported by browser");
      }
    });
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
  }
}

export { db, collection, addDoc, onSnapshot, query, orderBy, limit, isConfigured };
