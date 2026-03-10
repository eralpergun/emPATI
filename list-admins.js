import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function listAdmins() {
  try {
    const adminsRef = ref(db, 'admins');
    const snapshot = await get(adminsRef);
    if (snapshot.exists()) {
      console.log(JSON.stringify(snapshot.val(), null, 2));
    } else {
      console.log("No admins found.");
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listAdmins();
