import { useState } from "react";
import { Link } from "react-router-dom";
import { getUserLeagues } from "../api/api";

function Dashboard() {
  const [userId, setUserId] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLoadLeagues(e) {
    e.preventDefault();

    setError("");
    setLoading(true);
    setLeagues([]);

    try {
      const data = await getUserLeagues(userId);
      console.log("User leagues response:", data);

      const loadedLeagues = Array.isArray(data)
        ? data
        : data.leagues || [];

      setLeagues(loadedLeagues);
    } catch (err) {
      setError(err.message);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <p>
        <Link to="/submit-picks">Go to Submit Picks</Link>
      </p>

      <form onSubmit={handleLoadLeagues}>
        <label>User ID</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Load My Leagues"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>My Leagues</h2>

      {leagues.length === 0 && <p>No leagues loaded yet.</p>}

      {leagues.map((league) => (
        <div key={league.leagueId || league.id}>
          <h3>{league.leagueName || league.name}</h3>

          <p>
            <strong>League ID:</strong>{" "}
            {league.leagueId || league.id}
          </p>

          <p>
            <strong>Invite Code:</strong>{" "}
            {league.inviteCode}
          </p>
          <Link to={`/submit-picks?leagueId=${league.leagueId || league.id}&userId=${userId}&stage=group-stage`}>
            Submit Picks
          </Link>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;