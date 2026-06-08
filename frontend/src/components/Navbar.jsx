// src/components/Navbar.jsx
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <Link className="navbar-brand" to="/dashboard">
        🏆 World Cup Picks
      </Link>

      <div className="navbar-links">
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/create-league">Create</Link>
        <Link to="/">Join</Link>
      </div>
    </nav>
  );
}

export default Navbar;