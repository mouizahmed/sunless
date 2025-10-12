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

  // No need to reset folder navigation - handled by DashboardLayout

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
      {/* Dashboard Home - Show Upcoming Meetings */}
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <UpcomingMeetings />
      </div>

      {/* Recent Activity or Other Dashboard Content */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 flex-1 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            No recent activity
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
