import React, { useState, useEffect } from "react";
import { Calendar, FileText } from "lucide-react";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";

interface Meeting {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  organizer?: string;
  provider: string;
  is_meeting: boolean;
  attendees?: string[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  organizer?: string;
  provider: string;
  is_meeting: boolean;
  attendees?: string[];
}


export function UpcomingMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyMeetings, setShowOnlyMeetings] = useState(false);

  const fetchUpcomingMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get base URL for API calls
      const baseUrl = (window as unknown as { BACKEND_URL?: string }).BACKEND_URL || "http://localhost:8080";
      console.log("📅 Fetching calendar events from:", `${baseUrl}/api/calendar/upcoming?limit=3`);

      // Fetch upcoming events from backend using authenticated API call
      const response = await makeAuthenticatedApiCall(
        `${baseUrl}/api/calendar/upcoming?limit=3`
      );

      console.log("📅 Calendar API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("📅 Calendar API error response:", errorText);
        throw new Error(`Failed to fetch calendar events: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("📅 Calendar API response data:", data);

      if (data.status === "success" && data.events) {
        console.log("📅 Found events:", data.events.length);
        console.log("📅 Events details:", data.events);

        const formattedMeetings: Meeting[] = data.events.map((event: CalendarEvent) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          location: event.location,
          organizer: event.organizer,
          provider: event.provider,
          is_meeting: event.is_meeting,
          attendees: event.attendees,
        }));

        console.log("📅 Formatted meetings:", formattedMeetings);
        setMeetings(formattedMeetings);
      } else {
        console.log("📅 No events found or unexpected response format");
        console.log("📅 Response status:", data.status);
        console.log("📅 Response events:", data.events);
        setMeetings([]);
      }
    } catch (err) {
      console.error("📅 Failed to fetch upcoming meetings:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("📅 UpcomingMeetings component mounted, fetching meetings...");
    fetchUpcomingMeetings();
  }, []);

  const formatMeetingDate = (startTime: string) => {
    const date = new Date(startTime);
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = date.getDate();
    return { month, day: day.toString() };
  };

  const formatMeetingTime = (startTime: string) => {
    const date = new Date(startTime);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${dayName} ${time}`;
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
          Coming up
        </h2>
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Loading upcoming events...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
          Coming up
        </h2>
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Failed to load calendar events. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  console.log("📅 Rendering UpcomingMeetings - meetings:", meetings, "loading:", loading, "error:", error);

  // Filter meetings based on toggle
  const filteredMeetings = showOnlyMeetings
    ? meetings.filter(meeting => meeting.is_meeting)
    : meetings;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Coming up
        </h2>
        <button
          onClick={() => setShowOnlyMeetings(!showOnlyMeetings)}
          className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {showOnlyMeetings ? "Show All" : "Meetings Only"}
        </button>
      </div>

      {filteredMeetings.length > 0 ? (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => {
            const { month, day } = formatMeetingDate(meeting.start);
            const timeString = formatMeetingTime(meeting.start);

            return (
              <div
                key={meeting.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center bg-violet-600 text-white text-xs font-medium rounded px-2 py-1 min-w-[40px]">
                  <div>{month}</div>
                  <div>{day}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {meeting.title}
                    </h3>
                    {meeting.is_meeting && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        Meeting
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {timeString}
                  </p>
                  {meeting.location && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      📍 {meeting.location}
                    </p>
                  )}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      👥 {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No upcoming events. Check your{" "}
            <span className="text-cyan-500 hover:text-cyan-600 cursor-pointer">
              visible calendars
            </span>
          </p>
        </div>
      )}
    </div>
  );
}