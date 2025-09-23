import React, { useEffect } from "react";
import { useTopBar } from "@/contexts/TopBarContext";
import { useAuth } from "@/contexts/AuthContext";
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
    <div className="w-full h-full flex flex-col gap-2">
      {/* Full-width Upcoming Meetings Section */}
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <UpcomingMeetings />
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 flex-1">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          Recent Notes
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">
          Quick access to your recently edited notes and documents.
        </p>
      </div>
    </div>
  );
}

export default Home;
