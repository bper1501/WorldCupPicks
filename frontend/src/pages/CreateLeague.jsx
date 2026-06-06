import { useState } from "react";
import { createLeague } from "../api/api";
import { Link } from "react-router-dom";

function CreateLeague() {
  const [leagueName, setLeagueName] = useState("");
  const [userId, setUserId] = useState("");
  const [createdLeague, setCreatedLeague] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setCreatedLeague(null);
    setLoading(true);

    try {
      const data = await createLeague({
        leagueName,
        userId
      });

      setCreatedLeague(data);
      setLeagueName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Create League</h1>

      <p>
        Already have an invite code?{" "}
        <Link to="/">
            Join a league
        </Link>
    Í</p>

    <p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>League Name</label>
          <input
            type="text"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="World Cup Pool"
            required
          />
        </div>

        <div>
          <label>User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="brayan123"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create League"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {createdLeague && (
        <div>
          <h2>League Created!</h2>
          <p>
            <strong>League ID:</strong> {createdLeague.leagueId}
          </p>
          <p>
            <strong>Invite Code:</strong> {createdLeague.inviteCode}
          </p>
        </div>
      )}
    </div>
  );
}

export default CreateLeague;