// src/pages/Leaderboard.jsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLeaderboard } from "../api/api";

function Leaderboard() {
  const [searchParams] = useSearchParams();

  const leagueIdFromUrl = searchParams.get("leagueId") || "";
  const stageFromUrl = searchParams.get("stage") || "group-stage";

  const [leagueId, setLeagueId] = useState(leagueIdFromUrl);
  const [stage, setStage] = useState(stageFromUrl);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLoadLeaderboard(e) {
    e.preventDefault();

    setError("");
    setLoading(true);
    setLeaderboard([]);

    try {
      const data = await getLeaderboard({ leagueId, stage });

      console.log("Leaderboard response:", data);

      const loadedLeaderboard = Array.isArray(data)
        ? data
        : data.leaderboard || [];

      setLeaderboard(loadedLeaderboard);
    } catch (err) {
      setError(err.message);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Leaderboard</h1>

      <form onSubmit={handleLoadLeaderboard}>
        <div>
          <label>League ID</label>
          <input
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Stage</label>
          <input
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Load Leaderboard"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>{stage} Standings</h2>

      {leaderboard.length === 0 && !loading && (
        <p>No leaderboard loaded yet.</p>
      )}

      {leaderboard.length > 0 && (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Points</th>
              <th>Tiebreaker</th>
            </tr>
          </thead>

          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.userId || index}>
                <td>{index + 1}</td>
                <td>{entry.userId}</td>
                <td>{entry.points ?? entry.score ?? 0}</td>
                <td>{entry.tiebreakerGoals ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Leaderboard;