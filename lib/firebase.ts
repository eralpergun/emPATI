
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
  apiKey: "AIzaSyBGchpTjjpwTo5dTOzm5ImiROMk9XTspzw",
  authDomain: "empati-fb1a9.firebaseapp.com",
  projectId: "empati-fb1a9",
  storageBucket: "empati-fb1a9.firebasestorage.app",
  messagingSenderId: "830265145262",
  appId: "1:830265145262:web:80420542200bf223493a3f",
  measurementId: "G-4LNLQNYYMR"
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
