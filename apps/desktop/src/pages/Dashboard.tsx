import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "@/config/firebase";
import { getFirebaseIdToken } from "@/utils/firebase-api";
import Loading from "@/components/Loading";

function Dashboard() {
  const { setConfig } = useTopBar();
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up TopBar for dashboard
    setConfig({
      showSearchBar: true,
      showActionButtons: true,
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          picture: firebaseUser.photoURL || undefined,
        });
      } else {
        // Redirect unauthenticated users to welcome page (replace history)
        navigate("/", { replace: true });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setConfig, navigate, setUser]);

  if (loading) {
    return (
      <div
        className="h-full"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <Loading className="h-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <span className="text-lg">Not authenticated</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full p-4 bg-neutral-800 rounded-lg"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Main Dashboard Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-semibold mb-4">Welcome to Sunless</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your voice echoes into light. Start by creating your first note or
            exploring the features.
          </p>

          <div
            className="flex flex-col gap-4 w-full"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Button
              className="w-full py-3 text-base bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                // Example: Get Firebase ID token for API calls
                const idToken = await getFirebaseIdToken();
                if (idToken) {
                  console.log("🔑 Firebase ID token for API calls:", idToken);
                }
                console.log("🚀 Create new note");
              }}
            >
              Create New Note
            </Button>

            <Button
              variant="outline"
              className="w-full py-3 text-base"
              onClick={() => {
                console.log("📂 Browse existing notes");
              }}
            >
              Browse Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
