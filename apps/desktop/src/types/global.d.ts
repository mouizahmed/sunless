// OAuth Authentication Result
interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
  isLoggedIn?: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  firebaseToken?: string;
  lastLoginTime?: string;
}

// IPC Event type for Electron renderer
interface IpcRendererEvent {
  preventDefault(): void;
  sender: {
    send(channel: string, ...args: unknown[]): void;
  };
}

// Session update event data
interface AuthSessionUpdateEvent {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  firebaseToken?: string;
  error?: string;
  timestamp: string;
}

declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;

      // OAuth Authentication
      authenticateWithGoogle: () => Promise<AuthResult>;
      authenticateWithMicrosoft: () => Promise<AuthResult>;

      // Session Management
      logout: () => Promise<AuthResult>;
      setAuthState: (isAuthenticated: boolean) => Promise<AuthResult>;

      // Event listeners
      onAuthSessionUpdated: (
        callback: (event: any, data: AuthSessionUpdateEvent) => void,
      ) => () => void;
    };
    env: {
      platform: NodeJS.Platform;
    };
    // IPC Renderer (existing)
    ipcRenderer: {
      on: (
        channel: string,
        listener: (event: IpcRendererEvent, ...args: unknown[]) => void,
      ) => void;
      off: (channel: string, ...args: unknown[]) => void;
      send: (channel: string, ...args: unknown[]) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
  }
}

export {};
