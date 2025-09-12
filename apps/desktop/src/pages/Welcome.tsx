import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTopBar } from "@/contexts/TopBarContext";
import Typewriter from "typewriter-effect";

function Welcome() {
  const { setConfig } = useTopBar();

  useEffect(() => {
    // Welcome page has no additional TopBar features
    setConfig({});
  }, [setConfig]);
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 overflow-hidden"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <img src="/logo.png" alt="Sunless Logo" className="w-20 h-20 mb-8" />

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
        <Link to="/signin">
          <Button
            className="w-full py-3 text-base text-white"
            style={{ backgroundColor: "#8f87a6" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#746c89")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#8f87a6")
            }
          >
            Sign In
          </Button>
        </Link>

        <Link to="/signup">
          <Button
            variant="outline"
            className="w-full py-3 text-base"
            style={{ borderColor: "#8f87a6", color: "#8f87a6" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#8f87a6";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#8f87a6";
            }}
          >
            Sign Up
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default Welcome;
