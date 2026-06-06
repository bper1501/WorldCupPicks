import { useState } from "react";
import { joinLeague } from "../api/api";
import { Link } from "react-router-dom";

export default function JoinLeague() {
  const [inviteCode, setInviteCode] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleJoinLeague(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const data = await joinLeague({
        inviteCode: inviteCode.trim(),
        userId: userId.trim()
      });

      setMessage(data.message || "Joined league successfully!");
      console.log("Join league response:", data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "420px" }}>
      <h1>Join League</h1>

      <p>
        Want to create a league?{" "}
        <Link to="/create-league">
          Create one here
        </Link>
      </p>

      <p>
        <Link to="/dashboard">Go to Dashboard</Link>
      </p>

      <p> 
        <Link to="/submit-picks">Go to Submit Picks</Link>
      </p>

      <form onSubmit={handleJoinLeague}>
        <div style={{ marginBottom: "12px" }}>
          <label>Username</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Tony Aguirre"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="WORLD26"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </div>

        <button type="submit">Join League</button>
      </form>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}