// firebase/logGoalEvent.js
import { db } from "./config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const logGoalEvent = async (eventName) => {
  try {
    await addDoc(collection(db, "goal_tracking"), {
      event: eventName,
      timestamp: serverTimestamp(),
    });
    console.log(`Logged event: ${eventName}`);
  } catch (err) {
    console.error("Failed to log goal:", err);
  }
};
