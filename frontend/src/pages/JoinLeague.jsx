import { useState } from "react";
import { joinLeague } from "../api/api";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";


export default function JoinLeague() {
  const [inviteCode, setInviteCode] = useState("");
  // const [userId, setUserId] = useState(""); // We will get this from localStorage instead of user input
  const userId = localStorage.getItem("worldCupUserId");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleJoinLeague(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!userId) {
      setError("You must be logged in to join a league.");
      return;
    }

    try {
      const data = await joinLeague({
        inviteCode: inviteCode.trim(),
        userId: userId.trim()
      });

      setMessage(data.message || "Joined league successfully!");
      console.log("Join league response:", data);
      setLoading(false);
      localStorage.setItem("worldCupUserId", userId);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setLoading(false);  
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Join League</h1>

    <div className="card card-accent">
      <h2>Join an Existing Pool</h2>

      <p>
        Enter an invite code from a friend to join their World Cup league.
      </p>

      <p className="league-meta">
        <strong>Signed in as:</strong> {userId}
      </p>

      <form onSubmit={handleJoinLeague}>
          <label>Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="WORLD26"
            required
          />

        {/* <button type="submit">Join League</button> */}

        <button type="submit" disabled={loading}>
          {loading ? "Joining..." : "Join League"}
        </button>
      </form>
      </div>

    {message && (
      <p style={{ color: "green" }}>
        {message}
      </p>
    )}

    {error && (
      <p style={{ color: "red" }}>
        {error}
      </p>
    )}

    <div className="league-actions">
      <Link className="button-link" to="/create-league">
        Create League
      </Link>

      <Link
        className="button-link secondary-button"
        to="/dashboard"
      >
        Back to Dashboard
      </Link>
    </div>
    </div>
  );
}