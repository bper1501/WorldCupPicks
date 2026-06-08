import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import JoinLeague from "./pages/JoinLeague";
import CreateLeague from "./pages/CreateLeague";
import Dashboard from "./pages/Dashboard";
import SubmitPicks from "./pages/SubmitPicks";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<JoinLeague />} />
        <Route path="/create-league" element={<CreateLeague />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/submit-picks" element={<SubmitPicks />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;