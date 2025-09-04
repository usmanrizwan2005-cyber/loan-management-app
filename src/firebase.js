import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";
 
const firebaseConfig = {
  apiKey: "AIzaSyDCq80xwLcP9yREtv8G80AjtAZrCbTWZXY",
  authDomain: "loan-management-app-ca579.firebaseapp.com",
  projectId: "loan-management-app-ca579",
  storageBucket: "loan-management-app-ca579.firebasestorage.app",
  messagingSenderId: "957450939217",
  appId: "1:957450939217:web:1e5ada60e36bc9cee10170",
  measurementId: "G-WH787JRZ9N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
