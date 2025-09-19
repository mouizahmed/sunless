import { ipcRenderer, contextBridge } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),

  // OAuth Authentication
  authenticateWithGoogle: () => ipcRenderer.invoke("auth:google"),
  authenticateWithMicrosoft: () => ipcRenderer.invoke("auth:microsoft"),

  // Session Management
  logout: () => ipcRenderer.invoke("auth:logout"),
  setAuthState: (isAuthenticated: boolean) => ipcRenderer.invoke("auth:set-state", isAuthenticated),

  // Event listeners for session updates
  onAuthSessionUpdated: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on("auth-session-updated", callback);
    return () => ipcRenderer.removeListener("auth-session-updated", callback);
  },
});

contextBridge.exposeInMainWorld("env", {
  platform: process.platform,
});
