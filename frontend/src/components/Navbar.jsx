import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const userId = localStorage.getItem("worldCupUserId");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem("worldCupUserId");
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <nav className="navbar">
      <Link className="navbar-brand" to="/dashboard">
        🏆 World Cup <span>Picks</span>
      </Link>

      {userId && (
        <div className="navbar-mobile-right">
          <span className="navbar-user">{userId}</span>

          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>
      )}

      <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
        {userId ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/create-league">Create League</Link>
            <Link to="/">Join League</Link>

            <button
              className="navbar-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;