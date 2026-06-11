import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import JoinLeague from "./pages/JoinLeague";
import CreateLeague from "./pages/CreateLeague";
import Dashboard from "./pages/Dashboard";
import SubmitPicks from "./pages/SubmitPicks";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Admin from "./pages/Admin";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<ProtectedRoute>
        <JoinLeague />
      </ProtectedRoute>} />
        <Route path="/create-league" element={<ProtectedRoute>
        <CreateLeague />
      </ProtectedRoute>} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/submit-picks" element={
          <ProtectedRoute>
            <SubmitPicks />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path="/results" element={<Results />} />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        <Route
          path="*"
          element={
            <div className="page">
              <h1 className="page-title">
                Page Not Found
              </h1>

              <div className="card">
                <p>
                  Looks like this page doesn’t exist.
                </p>

                <Link
                  className="button-link"
                  to="/dashboard"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          }
        />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;