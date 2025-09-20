import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  logoutEverywhere: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const logout = async () => {
    try {
      const { auth } = await import("@/config/firebase");
      await auth.signOut();
      await window.electronAPI.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const logoutEverywhere = async () => {
    try {
      const { auth } = await import("@/config/firebase");
      const { callBackendLogout } = await import("@/utils/firebase-api");

      const baseUrl = (window as unknown as { BACKEND_URL?: string }).BACKEND_URL || "http://localhost:8080";
      await callBackendLogout(baseUrl);
      await auth.signOut();
      await window.electronAPI.logout();
      setUser(null);
    } catch (error) {
      console.error("Global logout error:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, logoutEverywhere }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}