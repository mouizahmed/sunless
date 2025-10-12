import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, onAuthStateChanged, signInWithCustomToken } from "@/config/firebase";
import { webSocketManager } from "@/utils/websocket";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  loginLoading: boolean;
  loginProvider: "google" | "microsoft" | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  logoutEverywhere: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  cancelAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginProvider, setLoginProvider] = useState<"google" | "microsoft" | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Listen for auth session updates from main process
    const removeListener = window.electronAPI.onAuthSessionUpdated(
      (_event, data) => {
        console.log("🔔 Received auth session update:", data);

        if (data.success && data.firebaseToken) {
          console.log("✅ Session updated with Firebase token");

          signInWithCustomToken(auth, data.firebaseToken)
            .then((cred) => {
              console.log("🔥 Signed into Firebase with custom token!");
              if (cred.user) {
                cred.user.getIdToken().then((idToken) => {
                  console.log("🔑 Firebase ID token for API calls:", idToken);
                });
              }
              setLoginLoading(false);
              setLoginProvider(null);
              setAuthError(null);
            })
            .catch((firebaseError) => {
              console.error("❌ Firebase sign-in failed:", firebaseError);
              setLoginLoading(false);
              setLoginProvider(null);
              setAuthError("Firebase authentication failed");
            });
        } else if (!data.success && data.error) {
          console.error("❌ Auth session update failed:", data.error);
          setLoginLoading(false);
          setLoginProvider(null);
          setAuthError(data.error || "Authentication failed");
        }
      },
    );

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          picture: firebaseUser.photoURL || undefined,
        });

        // Initialize WebSocket connection when user is authenticated
        webSocketManager.initialize();

        // Redirect authenticated users to dashboard
        if (location.pathname === "/" || location.pathname === "/welcome") {
          navigate("/dashboard", { replace: true });
        }
      } else {
        setUser(null);

        // Disconnect WebSocket when user logs out
        webSocketManager.disconnect();

        // Redirect unauthenticated users to welcome page
        if (location.pathname === "/" || location.pathname === "/dashboard") {
          navigate("/welcome", { replace: true });
        }
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      removeListener();
    };
  }, [navigate, location.pathname]);

  const logout = async () => {
    try {
      webSocketManager.disconnect();
      await auth.signOut();
      await window.electronAPI.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const logoutEverywhere = async () => {
    try {
      const { callBackendLogout } = await import("@/utils/firebase-api");

      webSocketManager.disconnect();
      const baseUrl = (window as unknown as { BACKEND_URL?: string }).BACKEND_URL || "http://localhost:8080";
      await callBackendLogout(baseUrl);
      await auth.signOut();
      await window.electronAPI.logout();
      setUser(null);
    } catch (error) {
      console.error("Global logout error:", error);
    }
  };

  const loginWithGoogle = async () => {
    setLoginLoading(true);
    setLoginProvider("google");
    setAuthError(null);

    try {
      console.log("Starting Google OAuth via system browser...");
      const result = await window.electronAPI.authenticateWithGoogle();

      if (result.success && result.token) {
        try {
          const authData = JSON.parse(result.token);

          if (authData.status === "pending") {
            console.log("✅ Google OAuth flow started!");
            console.log(`🔗 Session ID: ${authData.sessionId}`);
            console.log("⏳ Waiting for completion in browser...");
            // Keep loading state for pending authentication
            // The session will be updated via the auth-session-updated event
          } else {
            console.log("Received legacy auth format - handling directly");
            throw new Error("Please use the updated authentication flow");
          }
        } catch (parseError) {
          console.error("Failed to parse auth response:", parseError);
          throw new Error("Authentication response format unexpected");
        }
      } else {
        throw new Error(result.error || "Authentication failed");
      }
    } catch (error: unknown) {
      console.error("Google authentication error:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      setLoginLoading(false);
      setLoginProvider(null);
      setAuthError(errorMessage);
    }
  };

  const loginWithMicrosoft = async () => {
    setLoginLoading(true);
    setLoginProvider("microsoft");
    setAuthError(null);

    try {
      console.log("Starting Microsoft OAuth via system browser...");
      const result = await window.electronAPI.authenticateWithMicrosoft();

      if (result.success && result.token) {
        try {
          const authData = JSON.parse(result.token);

          if (authData.status === "pending") {
            console.log("✅ Microsoft OAuth flow started!");
            console.log(`🔗 Session ID: ${authData.sessionId}`);
            console.log("⏳ Waiting for completion in browser...");
            // Keep loading state for pending authentication
            // The session will be updated via the auth-session-updated event
          } else {
            console.log("Received legacy auth format - handling directly");
            throw new Error("Please use the updated authentication flow");
          }
        } catch (parseError) {
          console.error("Failed to parse auth response:", parseError);
          throw new Error("Authentication response format unexpected");
        }
      } else {
        throw new Error(result.error || "Authentication failed");
      }
    } catch (error: unknown) {
      console.error("Microsoft authentication error:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      setLoginLoading(false);
      setLoginProvider(null);
      setAuthError(errorMessage);
    }
  };

  const cancelAuth = () => {
    setLoginLoading(false);
    setLoginProvider(null);
    setAuthError(null);
    console.log("Auth flow cancelled by user");
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      authError,
      loginLoading,
      loginProvider,
      setUser,
      logout,
      logoutEverywhere,
      loginWithGoogle,
      loginWithMicrosoft,
      cancelAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}