import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Navbar() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("worldCupUserId");
  const [menuOpen, setMenuOpen] = useState(false);

function handleLogout() {
  localStorage.removeItem("worldCupUserId");
  navigate("/login", { replace: true });
}

  return (
    // <nav className="navbar">
    //   <Link className="navbar-brand" to="/dashboard">
    //     🏆 World Cup <span>Picks</span>
    //   </Link>

    //   <div className="navbar-links">
    //     {userId ? (
    //       <>
    //         <Link to="/dashboard">Dashboard</Link>
    //         <Link to="/create-league">Create</Link>
    //         <Link to="/">Join</Link>

    //         <span className="navbar-user">
    //           {userId}
    //         </span>

    //         <button className="navbar-logout" onClick={handleLogout}>
    //           Logout
    //         </button>
    //       </>
    //     ) : (
    //       <>
    //         <Link to="/login">Login</Link>
    //         <Link to="/register">Register</Link>
    //       </>
    //     )}
    //   </div>
    // </nav>

<nav className="navbar">
  <Link className="navbar-brand" to="/dashboard">
    🏆 World Cup <span>Picks</span>
  </Link>

  {userId && (
    <div className="navbar-mobile-right">
      <span className="navbar-user">
        {userId}
      </span>

      <button
        className="menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>
    </div>
  )}

  <div
    className={`navbar-links ${
      menuOpen ? "open" : ""
    }`}
  >
    {userId ? (
      <>
        <Link to="/dashboard">
          Dashboard
        </Link>

        <Link to="/create-league">
          Create League
        </Link>

        <Link to="/">
          Join League
        </Link>

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
        <Link to="/register">
          Register
        </Link>
      </>
    )}
  </div>
</nav>
  );
}

export default Navbar;