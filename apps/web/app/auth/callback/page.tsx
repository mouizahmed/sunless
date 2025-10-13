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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo2.png"
              alt="Sunless Logo"
              width={80}
              height={80}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-700"
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
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Failed
              </h1>
              <p className="text-gray-600">
                Authentication was cancelled or failed
              </p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Image
          src="/logo2.png"
          alt="Sunless Logo"
          width={80}
          height={80}
          className="rounded-xl"
        />
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Successful
            </h1>
            <p className="text-gray-600">
              You should be redirected to the app automatically.
            </p>
          </div>

          {code && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  If the app didn&apos;t open automatically, click the button
                  below.
                </p>
              </div>

              <button
                onClick={handleManualOpen}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Sunless
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
