import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "@/config/firebase";
import { getFirebaseIdToken, callBackendLogout } from "@/utils/firebase-api";
import Loading from "@/components/Loading";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

function Dashboard() {
  const { setConfig } = useTopBar();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up TopBar for dashboard
    setConfig({
      showSearchBar: true,
      showNewNoteButton: true,
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
        // Redirect unauthenticated users to welcome page
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setConfig, navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      await window.electronAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLogoutEverywhere = async () => {
    try {
      const baseUrl = (window as unknown as { BACKEND_URL?: string }).BACKEND_URL || "http://localhost:8080";
      await callBackendLogout(baseUrl);
      await auth.signOut();
      await window.electronAPI.logout();
    } catch (error) {
      console.error("Global logout error:", error);
    }
  };

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
      className="flex flex-col h-full p-8"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Profile Section */}
      <div className="flex items-center gap-4 mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        {user.picture && (
          <img
            src={user.picture}
            alt="Profile"
            className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700"
          />
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{user.name}</h2>
          <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
        </div>
        <div
          className="flex gap-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
          <Button variant="outline" onClick={handleLogoutEverywhere}>
            Log out everywhere
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-semibold mb-4">Welcome to Sunless</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your voice echoes into light. Start by creating your first note or exploring the features.
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