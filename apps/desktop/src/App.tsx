import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Welcome from "./pages/Welcome";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import TopBar from "./components/TopBar";

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearch = () => {
    console.log("Search clicked");
  };

  const handleNewNote = () => {
    console.log("New Note clicked");
  };

  // Check if user can go back (not on first page they visited)
  const canGoBack = window.history.length > 1;

  // Configure TopBar based on current route
  const getTopBarProps = () => {
    // Back button is universal for ALL pages
    const baseProps = { showBackButton: canGoBack };

    // Add additional features for dashboard/app pages (not auth pages)
    const isAuthPage = ["/", "/signin", "/signup"].includes(location.pathname);

    if (isAuthPage) {
      return baseProps; // Auth pages: just back button
    }

    // All other pages: back button + app features
    return {
      ...baseProps,
      showSearchBar: true,
      showNewNoteButton: true,
    };
  };

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        onBack={handleBack}
        onSearch={handleSearch}
        onNewNote={handleNewNote}
        {...getTopBarProps()}
      />

      <div className="flex-1 overflow-hidden pt-12">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
