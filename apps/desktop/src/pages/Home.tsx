import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseIdToken } from "@/utils/firebase-api";
import { UpcomingMeetings } from "@/components/UpcomingMeetings";

function Home() {
  const { setConfig } = useTopBar();
  const { user } = useAuth();

  useEffect(() => {
    // Set up TopBar for dashboard
    setConfig({
      showSearchBar: true,
      showActionButtons: true,
    });
  }, [setConfig]);

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
    <div className="">
      <div className="w-full">
        {/* Full-width Upcoming Meetings Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <UpcomingMeetings />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Recent Notes
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Quick access to your recently edited notes and documents.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Quick Actions
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
              Create new notes, start sessions, or organize your workspace.
            </p>
            <div
              className="flex flex-col gap-2"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Button
                className="w-full text-sm bg-violet-600 hover:bg-violet-700 text-white"
                onClick={async () => {
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
                className="w-full text-sm"
                onClick={() => {
                  console.log("📂 Browse existing notes");
                }}
              >
                Browse Notes
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Workspace Stats
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Overview of your productivity and workspace activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
