import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCl1UWI3S_Jw9iGXvCY32wloLz_ai7kds",
  projectId: "meal-planner-vibe",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log("TESTING FIREBASE CONNECTION...");
  try {
    const testDoc = doc(db, 'shoppingList', 'test-item-server');
    await setDoc(testDoc, { text: 'Test from backend Server', checked: false });
    console.log("SUCCESS");
    process.exit(0);
  } catch(e) {
    console.error("FAIL", e);
    process.exit(1);
  }
}
test();
