import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateLeague from "./pages/CreateLeague";
import JoinLeague from "./pages/JoinLeague";
import Dashboard from "./pages/Dashboard";
import SubmitPicks from "./pages/SubmitPicks";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinLeague />} />
        <Route path="/create-league" element={<CreateLeague />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/submit-picks" element={<SubmitPicks />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;