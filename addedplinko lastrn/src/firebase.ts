import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCZSjjQxtSFVOt6FPKUuL-Lr-VbbmvfyWY",
  authDomain: "ps99core.firebaseapp.com",
  databaseURL: "https://ps99core-default-rtdb.firebaseio.com",
  projectId: "ps99core",
  storageBucket: "ps99core.firebasestorage.app",
  messagingSenderId: "1022302452170",
  appId: "1:1022302452170:web:f1d2c4018355dd667df733",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);
