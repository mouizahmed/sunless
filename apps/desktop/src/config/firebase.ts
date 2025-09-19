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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXpAhp5TRtthtYgmjRBAKvapzXJi_udjg",
  authDomain: "sunless-1e6a1.firebaseapp.com",
  projectId: "sunless-1e6a1",
  storageBucket: "sunless-1e6a1.firebasestorage.app",
  messagingSenderId: "861156340434",
  appId: "1:861156340434:web:a62b156a38d70b60c9f30b",
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
