declare global {
  // Authentication Result - using discriminated union for type safety
  type AuthResult =
    | {
        success: true;
        token?: string; // Present for OAuth flows, absent for logout
      }
    | {
        success: false;
        error: string;
      };

  // IPC Event type for Electron renderer
  interface IpcRendererEvent {
    preventDefault(): void;
    sender: {
      send(channel: string, ...args: unknown[]): void;
    };
  }

  // Session update event data - using discriminated union for type safety
  type AuthSessionUpdateEvent =
    | {
        success: true;
        firebaseToken: string;
        timestamp: string;
      }
    | {
        success: false;
        error: string;
        timestamp: string;
      };
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
      logoutEverywhere: (idToken: string) => Promise<AuthResult>;

      // Event listeners
      onAuthSessionUpdated: (
        callback: (
          event: IpcRendererEvent,
          data: AuthSessionUpdateEvent,
        ) => void,
      ) => () => void;
    };
    env: {
      platform: NodeJS.Platform;
    };
  }
}

export {};
