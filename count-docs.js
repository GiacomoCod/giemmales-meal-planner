import { initializeApp } from "firebase/app";
import { getFirestore, collection, getCountFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCl1UWI3S_Jw9iGXvCY32wloLz_ai7kds",
  authDomain: "meal-planner-vibe.firebaseapp.com",
  projectId: "meal-planner-vibe",
  storageBucket: "meal-planner-vibe.firebasestorage.app",
  messagingSenderId: "981656795010",
  appId: "1:981656795010:web:85c81b8e8d72b9a10a419b",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const profileId = 'giemmale'; // adjust if needed

async function count() {
  const cols = ['roomTasks', 'cleaningLogs', 'tags', 'events', 'recipes', 'shoppingList', 'notifications', 'mealPlans'];
  for (const col of cols) {
    const p = col === 'mealPlans' || col === 'roomTasks' || col === 'cleaningLogs' || col === 'tags' || col === 'events' || col === 'recipes' || col === 'shoppingList' || col === 'notifications' ? `profiles/${profileId}/${col}` : col;
    
    // Actually giemmale saves at root for some reason?
    // In App.tsx: colPath = activeProfile.id === 'giemmale' ? name : `profiles/${activeProfile.id}/${name}`
    const actualPath = col; 

    try {
      const snap = await getCountFromServer(collection(db, actualPath));
      console.log(`${actualPath}: ${snap.data().count}`);
    } catch(e) {
      console.log(`Failed for ${actualPath}:`, e.message);
    }
  }
}
count();
