import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import Typewriter from "typewriter-effect";

function Welcome() {
  const { setConfig } = useTopBar();

  useEffect(() => {
    // Welcome page has no additional TopBar features
    setConfig({});
  }, [setConfig]);

  const handleGoogleAuth = async () => {
    console.log("Google Auth clicked");
  };

  const handleMicrosoftAuth = async () => {
    console.log("Microsoft Auth clicked");
  };
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
        <Button
          variant="outline"
          className="w-full py-3 text-base border-input text-card-foreground bg-card hover:bg-accent hover:text-accent-foreground"
          onClick={handleGoogleAuth}
        >
          <img
            src="./google.svg"
            alt="Google"
            width={20}
            height={20}
            className="mr-2"
          />
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="w-full py-3 text-base border-input text-card-foreground bg-card hover:bg-accent hover:text-accent-foreground"
          onClick={handleMicrosoftAuth}
        >
          <img
            src="./microsoft.svg"
            alt="Microsoft"
            width={20}
            height={20}
            className="mr-2"
          />
          Continue with Microsoft
        </Button>
      </div>
    </div>
  );
}

export default Welcome;
