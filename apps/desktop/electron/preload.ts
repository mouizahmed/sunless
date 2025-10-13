import { ipcRenderer, contextBridge, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),

  // OAuth Authentication
  authenticateWithGoogle: () => ipcRenderer.invoke("auth:google"),
  authenticateWithMicrosoft: () => ipcRenderer.invoke("auth:microsoft"),

  // Session Management
  logout: () => ipcRenderer.invoke("auth:logout"),
  logoutEverywhere: (idToken: string) =>
    ipcRenderer.invoke("auth:logout-everywhere", idToken),

  // Event listeners for session updates
  onAuthSessionUpdated: (
    callback: (event: IpcRendererEvent, data: AuthSessionUpdateEvent) => void,
  ) => {
    ipcRenderer.on("auth-session-updated", callback);
    return () => ipcRenderer.removeListener("auth-session-updated", callback);
  },
});

contextBridge.exposeInMainWorld("env", {
  platform: process.platform,
});
