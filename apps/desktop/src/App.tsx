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
  const [wsError, setWsError] = useState(false);

  // Subscribe to WebSocket critical errors
  useEffect(() => {
    const unsubscribe = webSocketManager.onError(() => {
      setWsError(true);
    });

    return unsubscribe;
  }, []);

  // Show WebSocket error screen
  if (wsError) {
    return (
      <CriticalError
        title="Connection lost"
        message="Unable to maintain connection to the server. Please check your internet connection and try again."
        onRetry={() => {
          setWsError(false);
          webSocketManager.initialize();
        }}
        retryText="Reconnect"
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

  const handleSearch = () => {
    console.log("Search clicked");
  };

  const handleUploadFile = () => {
    console.log("Upload File clicked");
  };

  const handleNewMeeting = () => {
    console.log("New Meeting clicked");
  };

  return (
    <div
      className={`h-screen ${
        config.visible !== false ? "grid grid-rows-[auto_1fr]" : "flex flex-col"
      }`}
    >
      {config.visible !== false && (
        <TopBar
          onBack={handleBack}
          onSearch={handleSearch}
          onUploadFile={handleUploadFile}
          onNewMeeting={handleNewMeeting}
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
