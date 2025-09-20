import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getFirebaseIdToken } from "@/utils/firebase-api";

function Dashboard() {
  const { setConfig } = useTopBar();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up TopBar for dashboard
    setConfig({
      showSearchBar: true,
      showActionButtons: true,
    });

    // Redirect unauthenticated users to welcome page
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [setConfig, navigate, isAuthenticated]);

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
