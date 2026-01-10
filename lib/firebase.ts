
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";

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

// Config kontrolü: Eğer apiKey boş değilse ve varsayılan değer değilse true döner
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0 && firebaseConfig.apiKey !== "YOUR-API-KEY-HERE";

let db: any;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
  }
}

export { db, collection, addDoc, onSnapshot, query, orderBy, limit, isConfigured };
