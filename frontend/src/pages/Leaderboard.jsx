// src/pages/Leaderboard.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLeaderboard } from "../api/api";
import { Link } from "react-router-dom";

function Leaderboard() {
  const [searchParams] = useSearchParams();

  const leagueIdFromUrl = searchParams.get("leagueId") || "";
  const stageFromUrl = searchParams.get("stage") || "group-stage";
  const leagueNameFromUrl =
  searchParams.get("leagueName") || "";

  const hasUrlParams = Boolean(leagueIdFromUrl && stageFromUrl);

  const [leagueId, setLeagueId] = useState(leagueIdFromUrl);
  const [stage, setStage] = useState(stageFromUrl);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  function formatStageName(stageValue) {
    return stageValue
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  async function loadLeaderboard() {
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

  async function handleLoadLeaderboard(e) {
    e.preventDefault();
    await loadLeaderboard();
  }

  useEffect(() => {
    if (leagueId && stage) {
      loadLeaderboard();
    }
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Leaderboard</h1>

      <Link className="button-link" to="/dashboard">
        Back to Dashboard
      </Link>


      {hasUrlParams && (
        <div className="dashboard-summary">
        <p>
          <strong>League:</strong>{" "}
          {leagueNameFromUrl || leagueId}
        </p>

          <p>
            <strong>Stage:</strong> {formatStageName(stage)}
          </p>
        </div>
      )}

      {!hasUrlParams && (
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
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading && <p>Loading leaderboard...</p>}

      {!loading && leaderboard.length === 0 && (
        <div className="card">
          <h3>No leaderboard yet</h3>

          <p>
            Scores will appear once picks are submitted
            and matches are finalized.
          </p>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div>
          <h2>{formatStageName(stage)} Standings</h2>

          {leaderboard.map((entry, index) => {
            const points = entry.points ?? entry.score ?? 0;
            const rank = index + 1;
            const rankClass =
            rank === 1
              ? "rank-gold"
              : rank === 2
              ? "rank-silver"
              : rank === 3
              ? "rank-bronze"
              : "rank-default";

            return (
              <div className="leaderboard-card" key={entry.userId || index}>
                <div className={`rank-badge ${rankClass}`}>#{rank}</div>

                <div>
                  <h3>{entry.userId}</h3>

                  <p className="league-meta">
                    <strong>{points}</strong> pts
                  </p>

                  {/* <p className="league-meta">
                    <strong>Tiebreaker:</strong>{" "}
                    {entry.tiebreakerGoals ?? "-"}
                  </p> */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;