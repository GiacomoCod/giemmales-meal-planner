import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCl1UWI3S_Jw9iGXvCY32wloLz_ai7kds",
  authDomain: "meal-planner-vibe.firebaseapp.com",
  projectId: "meal-planner-vibe",
  storageBucket: "meal-planner-vibe.firebasestorage.app",
  messagingSenderId: "981656795010",
  appId: "1:981656795010:web:85c81b8e8d72b9a10a419b",
  measurementId: "G-BRWHDHV0EZ"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
