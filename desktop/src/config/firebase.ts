import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth'

// Define Firebase config type
interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

// Declare global for build-time Firebase config
declare global {
  const __FIREBASE_CONFIG__: FirebaseConfig
}

// Firebase configuration from build-time constants
// TODO: Add Firebase credentials to vite.config.ts define
const firebaseConfig: FirebaseConfig = __FIREBASE_CONFIG__

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Ensure persistent authentication across app restarts
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase persistence:', error)
})

export { auth, signInWithCustomToken, onAuthStateChanged }
