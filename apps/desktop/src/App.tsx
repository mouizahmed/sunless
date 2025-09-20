import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import TopBar from "./components/TopBar";
import { DashboardLayout } from "./components/DashboardLayout";
import { SidebarProvider } from "./components/ui/sidebar";
import { useNavigationHistory } from "./hooks/useNavigationHistory";
import { TopBarProvider, useTopBar } from "./contexts/TopBarContext";
import { UserProvider } from "./contexts/UserContext";

function AppLayout() {
  const { canGoBack, handleBack } = useNavigationHistory();
  const { config } = useTopBar();

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
    <div className={`h-screen ${config.visible !== false ? 'grid grid-rows-[auto_1fr]' : 'flex flex-col'}`}>
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
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <TopBarProvider>
        <UserProvider>
          <SidebarProvider defaultOpen={true}>
            <AppLayout />
          </SidebarProvider>
        </UserProvider>
      </TopBarProvider>
    </Router>
  );
}

export default App;
