import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import TopBar from "./components/TopBar";
import { useNavigationHistory } from "./hooks/useNavigationHistory";
import { TopBarProvider, useTopBar } from "./contexts/TopBarContext";

function AppLayout() {
  const { canGoBack, handleBack } = useNavigationHistory();
  const { config } = useTopBar();

  const handleSearch = () => {
    console.log("Search clicked");
  };

  const handleNewNote = () => {
    console.log("New Note clicked");
  };

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        onBack={handleBack}
        onSearch={handleSearch}
        onNewNote={handleNewNote}
        showBackButton={canGoBack}
        showSearchBar={config.showSearchBar}
        showNewNoteButton={config.showNewNoteButton}
      />

      <div className="flex-1 overflow-hidden pt-12">
        <Routes>
          <Route path="/" element={<Welcome />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <TopBarProvider>
        <AppLayout />
      </TopBarProvider>
    </Router>
  );
}

export default App;
