import React from "react";
import { Button } from "@/components/ui/button";

interface CriticalErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
}

export const CriticalError: React.FC<CriticalErrorProps> = ({
  title = "Something went wrong",
  message = "An unexpected error occurred, restart the app and try again.",
  onRetry,
  retryText = "Retry",
}) => {
  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center p-4"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="w-full max-w-md">
        <div
          className="text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 shadow-lg"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            {title}
          </h1>

          {/* Error Message */}
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                {retryText}
              </Button>
            )}

            <Button
              onClick={handleRestart}
              variant="outline"
              className="w-full border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              Restart App
            </Button>
          </div>

          {/* Contact Info */}
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              If this problem persists, contact{" "}
              <a
                href="mailto:support@sunless.app"
                className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                support@sunless.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
