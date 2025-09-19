import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";

// Firebase configuration from environment variables
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Ensure persistent authentication across app restarts
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to set Firebase persistence:", error);
});

// Configure providers
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");

const microsoftProvider = new OAuthProvider("microsoft.com");
microsoftProvider.addScope("openid");
microsoftProvider.addScope("email");
microsoftProvider.addScope("profile");

export {
  auth,
  googleProvider,
  microsoftProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
};
