import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import { useNavigate } from "react-router-dom";
import Typewriter from "typewriter-effect";
import { auth, signInWithCustomToken, onAuthStateChanged } from "@/config/firebase";
import Loading from "@/components/Loading";

interface AuthState {
  loading: boolean;
  provider: "google" | "microsoft" | null;
  error: string | null;
}

function Welcome() {
  const { setConfig } = useTopBar();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    loading: false,
    provider: null,
    error: null,
  });

  // Set up authentication event listeners
  useEffect(() => {
    let authStateListenerUnsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        console.log("🔍 Initializing authentication...");

        // Set up Firebase auth state listener - handles persistence
        authStateListenerUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log("🔔 Firebase auth state changed:", firebaseUser ? "logged in" : "logged out");

          if (firebaseUser) {
            console.log(`✅ Firebase user: ${firebaseUser.displayName} (${firebaseUser.email})`);
            await window.electronAPI.setAuthState(true);
            // Redirect to dashboard for authenticated users (replace history)
            navigate('/dashboard', { replace: true });
          } else {
            console.log("🔓 No Firebase user found");
            await window.electronAPI.logout();

            setAuthState(prev => ({
              ...prev,
              error: null,
            }));
          }
        });

      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: "Failed to initialize authentication",
        }));
      }
    };

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
            })
            .catch((firebaseError) => {
              console.error("❌ Firebase sign-in failed:", firebaseError);
              setAuthState(prev => ({
                ...prev,
                loading: false,
                error: "Firebase authentication failed",
              }));
            });
        } else if (!data.success && data.error) {
          console.error("❌ Auth session update failed:", data.error);
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: data.error || "Authentication failed",
          }));
        }
      },
    );

    // Welcome page has no additional TopBar features
    setConfig({});

    // Initialize authentication
    initializeAuth();

    // Cleanup listeners on unmount
    return () => {
      removeListener();
      if (authStateListenerUnsubscribe) {
        authStateListenerUnsubscribe();
      }
    };
  }, [setConfig, navigate]);


  const handleGoogleAuth = async () => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      provider: "google",
      error: null,
    }));

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
            // when user completes authentication in browser
          } else {
            // Handle legacy format if still received
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
      setAuthState(prev => ({
        ...prev,
        loading: false,
        provider: null,
        error: errorMessage,
      }));
    }
  };

  const handleMicrosoftAuth = async () => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      provider: "microsoft",
      error: null,
    }));

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
            // when user completes authentication in browser
          } else {
            // Handle legacy format if still received
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
      setAuthState(prev => ({
        ...prev,
        loading: false,
        provider: null,
        error: errorMessage,
      }));
    }
  };

  // Show login interface
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 overflow-hidden"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <img src="./logo.png" alt="Sunless Logo" className="w-20 h-20 mb-8" />

      <h1 className="text-4xl font-semibold text-center mb-8 leading-tight h-24 flex items-center">
        <Typewriter
          options={{
            autoStart: true,
            loop: false,
            delay: 75,
            cursor: "|",
            wrapperClassName: "text-center",
          }}
          onInit={(tw) => {
            tw.typeString("Your voice echoes<br>into light").start();
          }}
        />
      </h1>

      <div
        className="flex flex-col gap-4 w-72 mb-8"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {authState.error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm text-center">
            {authState.error}
          </div>
        )}

        {authState.loading && authState.provider && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-md text-blue-700 dark:text-blue-300 text-sm text-center">
            Complete authentication in your browser, then return to this app.
          </div>
        )}

        <Button
          variant="outline"
          className="w-full cursor-pointer py-3 text-base border-input text-card-foreground bg-card hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          onClick={handleGoogleAuth}
          disabled={authState.loading}
        >
          {authState.loading && authState.provider === "google" ? (
            <>
              <Loading size="small" className="mr-2" />
              Waiting for browser...
            </>
          ) : (
            <>
              <img
                src="./google.svg"
                alt="Google"
                width={20}
                height={20}
                className="mr-2"
              />
              Continue with Google
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full cursor-pointer py-3 text-base border-input text-card-foreground bg-card hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          onClick={handleMicrosoftAuth}
          disabled={authState.loading}
        >
          {authState.loading && authState.provider === "microsoft" ? (
            <>
              <Loading size="small" className="mr-2" />
              Waiting for browser...
            </>
          ) : (
            <>
              <img
                src="./microsoft.svg"
                alt="Microsoft"
                width={20}
                height={20}
                className="mr-2"
              />
              Continue with Microsoft
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default Welcome;
