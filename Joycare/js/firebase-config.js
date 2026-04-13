// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJ3NYZQx2aJJ52tD_YSfkz3x-xw3ALPaQ",
  authDomain: "joycare-c90ac.firebaseapp.com",
  projectId: "joycare-c90ac",
  storageBucket: "joycare-c90ac.firebasestorage.app",
  messagingSenderId: "942390580651",
  appId: "1:942390580651:web:435434100afc844fd52eee",
  measurementId: "G-2NNW7YQ0G9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Providers and Utilities
const googleProvider = new GoogleAuthProvider();

// Export instances for app.js
window.firebaseAuth = auth;
window.firebaseDb = db;
window.googleProvider = googleProvider;
window.RecaptchaVerifier = RecaptchaVerifier;
window.signInWithPhoneNumber = signInWithPhoneNumber;

export { auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber };
