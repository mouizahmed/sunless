import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Welcome from "./pages/Welcome";
import TopBar from "./components/TopBar";
import { DashboardLayout } from "./components/DashboardLayout";
import { SidebarProvider } from "./components/ui/sidebar";
import { useNavigationHistory } from "./hooks/useNavigationHistory";
import { TopBarProvider, useTopBar } from "./contexts/TopBarContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { FolderNavigationProvider } from "./contexts/FolderNavigationContext";
import Loading from "./components/Loading";
import { CriticalError } from "./components/CriticalError";
import { webSocketManager } from "./utils/websocket";

function AppLayout() {
  const { canGoBack, handleBack } = useNavigationHistory();
  const { config } = useTopBar();
  const { isLoading } = useAuth();
  const [criticalError, setCriticalError] = useState<string | null>(null);

  // Subscribe to WebSocket critical errors
  useEffect(() => {
    const unsubscribe = webSocketManager.onCriticalError((error) => {
      setCriticalError(error);
    });

    return unsubscribe;
  }, []);

  // Show critical error screen
  if (criticalError) {
    return (
      <CriticalError
        title="Something went wrong"
        message={criticalError}
        onRetry={() => {
          setCriticalError(null);
          webSocketManager.initialize();
        }}
        retryText="Retry"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div
      className={`h-screen ${
        config.visible !== false ? "grid grid-rows-[auto_1fr]" : "flex flex-col"
      }`}
    >
      {config.visible !== false && (
        <TopBar
          onBack={handleBack}
          showBackButton={canGoBack}
          showSearchBar={config.showSearchBar}
          showActionButtons={config.showActionButtons}
        />
      )}

      <div className="overflow-hidden flex-1">
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <WorkspaceProvider>
          <FolderNavigationProvider>
            <TopBarProvider>
              <SidebarProvider defaultOpen={true}>
                <AppLayout />
              </SidebarProvider>
            </TopBarProvider>
          </FolderNavigationProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
