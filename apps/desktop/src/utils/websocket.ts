import { getFirebaseIdToken } from "./firebase-api";

export interface WSMessage {
  type: string;
  data: unknown;
}

export type MessageHandler = (data: unknown) => void;
export type ErrorHandler = () => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private errorHandlers: ErrorHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private shouldAutoConnect = false;

  constructor() {
    // Don't auto-connect - wait for explicit connection
  }

  private async connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.isConnecting = true;
      console.log("🔌 Connecting to WebSocket...");

      // Get Firebase ID token for authentication
      const idToken = await getFirebaseIdToken();
      if (!idToken) {
        throw new Error("No authentication token available");
      }

      // Get base URL
      const baseUrl = (window as unknown as { BACKEND_URL?: string }).BACKEND_URL || "http://localhost:8080";
      const wsUrl = baseUrl.replace(/^http/, 'ws') + `/api/ws`;

      // Create WebSocket connection with auth token as sub-protocol
      this.ws = new WebSocket(wsUrl, ['bearer', idToken]);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", message);
          this.handleMessage(message);
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error("❌ Failed to connect WebSocket:", error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (!this.shouldAutoConnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (!this.shouldAutoConnect) {
        console.log("🔌 WebSocket auto-reconnect disabled");
      } else {
        console.error("❌ Max WebSocket reconnection attempts reached");
        // Trigger error handlers after max attempts
        this.errorHandlers.forEach(handler => {
          try {
            handler();
          } catch (error) {
            console.error("❌ Error in WebSocket error handler:", error);
          }
        });
      }
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  private handleMessage(message: WSMessage) {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error(`❌ Error in WebSocket handler for ${message.type}:`, error);
        }
      });
    } else {
      console.warn(`⚠️ No handlers registered for WebSocket message type: ${message.type}`);
    }
  }

  public subscribe(messageType: string, handler: MessageHandler) {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    this.handlers.get(messageType)!.push(handler);

    console.log(`📝 Subscribed to WebSocket message type: ${messageType}`);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          console.log(`🗑️ Unsubscribed from WebSocket message type: ${messageType}`);
        }
      }
    };
  }

  public onError(handler: ErrorHandler) {
    this.errorHandlers.push(handler);

    console.log("📝 Subscribed to WebSocket critical errors");

    // Return unsubscribe function
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
        console.log("🗑️ Unsubscribed from WebSocket critical errors");
      }
    };
  }

  public initialize() {
    console.log("🔌 Initializing WebSocket connection...");
    this.shouldAutoConnect = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect();
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect() {
    console.log("🔌 Disconnecting WebSocket...");
    this.shouldAutoConnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }
}

// Create singleton instance
export const webSocketManager = new WebSocketManager();

// Export message type constants
export const WS_MESSAGE_TYPES = {
  CALENDAR_UPDATED: 'calendar_updated',
} as const;