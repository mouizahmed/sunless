import { auth } from "@/config/firebase";

/**
 * Get a fresh Firebase ID token for API calls
 * This function handles token refresh automatically
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      console.log("❌ No authenticated user found");
      return null;
    }

    // Get a fresh ID token (Firebase SDK handles refresh automatically)
    const idToken = await auth.currentUser.getIdToken();
    console.log("🔑 Retrieved fresh Firebase ID token for API call");
    return idToken;
  } catch (error) {
    console.error("❌ Failed to get Firebase ID token:", error);
    return null;
  }
}

/**
 * Make an authenticated API call with Firebase ID token
 */
export async function makeAuthenticatedApiCall(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const idToken = await getFirebaseIdToken();

  if (!idToken) {
    throw new Error("No authentication token available");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Call backend logout (global revocation) with current ID token
 */
export async function callBackendLogout(baseUrl: string): Promise<boolean> {
  try {
    const response = await makeAuthenticatedApiCall(
      `${baseUrl.replace(/\/$/, "")}/api/auth/logout`,
      { method: "POST" },
    );
    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Backend logout failed:", response.status, text);
      return false;
    }
    console.log("✅ Backend logout successful (tokens revoked)");
    return true;
  } catch (err) {
    console.error("❌ Backend logout error:", err);
    return false;
  }
}
