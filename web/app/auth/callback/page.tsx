"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get("error");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      console.log("❌ OAuth error:", error);
      return;
    }

    if (!code) {
      console.warn("⚠️ No code in callback URL");
      return;
    }

    console.log("🔑 Code received:", code);
    console.log("🔑 State received:", state);

    // Try to open desktop app
    try {
      const protocolUrl = `sunless://auth-complete?code=${code}&state=${state}`;
      console.log("🔗 Opening app with:", protocolUrl);

      // Set location to trigger protocol
      window.location.href = protocolUrl;

      // Try to close if opened from desktop app
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 1000);
    } catch {
      console.log("Could not redirect to app");
    }
  }, [searchParams]);

  const handleManualOpen = () => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code) {
      window.location.href = `sunless://auth-complete?code=${code}&state=${state}`;
    }
  };

  const error = searchParams.get("error");
  const code = searchParams.get("code");

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-rose-50 to-rose-100 flex items-center justify-center px-6 py-10 text-center">
        <div className="flex w-full max-w-xl flex-col items-center gap-6">
          <Image
            src="/logo2.png"
            alt="Sunless Logo"
            width={80}
            height={80}
            className="rounded-2xl"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-200 text-rose-700 shadow-sm">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <div className="space-y-3">
            <h1 className="font-serif text-3xl text-rose-950 sm:text-4xl">
              Authentication Failed
            </h1>
            <p className="text-sm text-rose-700/80 sm:text-base">
              Authentication was cancelled or failed. You can return to the
              homepage and try again.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-200/70 transition hover:bg-purple-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show success state
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f1ff] via-[#f3edff] to-[#ede7ff] flex items-center justify-center px-6 py-12 text-center">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <Image
          src="/logo2.png"
          alt="Sunless Logo"
          width={88}
          height={88}
          className="rounded-2xl"
        />

        <div className="space-y-3">
          <h1 className="font-serif text-4xl text-purple-950 sm:text-5xl">
            Opening Sunless...
          </h1>
          <p className="text-sm text-purple-700/80 sm:text-base">
            Your browser should prompt you to open the app automatically.
          </p>
        </div>

        {code && (
          <div className="space-y-2 text-sm text-purple-700/80">
            <span className="block">Nothing happened?</span>
            <button
              onClick={handleManualOpen}
              className="inline-flex items-center gap-2 text-purple-700 underline decoration-purple-400 underline-offset-4 transition hover:text-purple-900"
            >
              <ExternalLink className="h-4 w-4" />
              Click here to open Sunless.
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#f7f1ff] via-[#f3edff] to-[#ede7ff] flex items-center justify-center px-6 py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-purple-300 border-t-purple-700"></div>
            <p className="text-sm text-purple-700/80">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
