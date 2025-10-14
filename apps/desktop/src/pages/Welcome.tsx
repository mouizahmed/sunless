import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import { useAuth } from "@/contexts/AuthContext";
import Typewriter from "typewriter-effect";
import Loading from "@/components/Loading";

const AUTH_BUTTON_CLASSES =
  "w-full cursor-pointer py-3 text-base border-input text-card-foreground bg-card hover:bg-accent hover:text-accent-foreground disabled:opacity-50";

function Welcome() {
  const { setConfig } = useTopBar();
  const {
    authError,
    loginLoading,
    loginProvider,
    loginWithGoogle,
    loginWithMicrosoft,
    cancelAuth,
  } = useAuth();

  useEffect(() => {
    // Welcome page hides the TopBar entirely
    setConfig({ visible: false });
  }, [setConfig]);

  // Show login interface
  return (
    <div
      className="flex flex-col items-center justify-center h-full overflow-hidden"
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
        {authError && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm text-center">
            {authError}
          </div>
        )}

        {loginLoading && loginProvider && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-md text-blue-700 dark:text-blue-300 text-sm text-center">
            Complete authentication in your browser, then return to this app.
          </div>
        )}

        <Button
          variant="outline"
          className={AUTH_BUTTON_CLASSES}
          onClick={loginWithGoogle}
          disabled={loginLoading}
        >
          {loginLoading && loginProvider === "google" ? (
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
          className={AUTH_BUTTON_CLASSES}
          onClick={loginWithMicrosoft}
          disabled={loginLoading}
        >
          {loginLoading && loginProvider === "microsoft" ? (
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

        {loginLoading && loginProvider && (
          <Button
            variant="ghost"
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={cancelAuth}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default Welcome;
