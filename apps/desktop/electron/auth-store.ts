import Store from "electron-store";

const authStore = new Store({
  name: "auth",
  defaults: {
    isAuthenticated: false,
    lastLoginTime: 0,
  },
});

export class AuthStore {
  static setAuthState(isAuthenticated: boolean): void {
    authStore.set("isAuthenticated", isAuthenticated);
    if (isAuthenticated) {
      authStore.set("lastLoginTime", Date.now());
    }
  }

  static isLoggedIn(): boolean {
    return authStore.get("isAuthenticated", false);
  }

  static clearAuth(): void {
    authStore.set("isAuthenticated", false);
  }

  static getLastLoginTime(): Date | null {
    const timestamp = authStore.get("lastLoginTime", 0);
    return timestamp > 0 ? new Date(timestamp) : null;
  }
}

export default AuthStore;
