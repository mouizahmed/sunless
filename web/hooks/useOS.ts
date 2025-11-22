"use client";

import { useState, useEffect } from "react";

type OS = "windows" | "mac" | "linux" | "android" | "ios" | "unknown";

export function useOS() {
  const [os, setOS] = useState<OS>("unknown");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("windows")) {
      setOS("windows");
    } else if (userAgent.includes("mac")) {
      setOS("mac");
    } else if (userAgent.includes("linux")) {
      setOS("linux");
    } else if (userAgent.includes("android")) {
      setOS("android");
    } else if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      setOS("ios");
    } else {
      setOS("unknown");
    }
  }, []);

  return os;
}
