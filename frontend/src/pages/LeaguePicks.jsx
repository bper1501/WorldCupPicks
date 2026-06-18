import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLeaguePicks } from "../api/api";

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeaguePicks() {
  const { leagueId } = useParams();

  const [stage, setStage] = useState("group-stage");
  const [data, setData] = useState(null);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userId = localStorage.getItem("worldCupUserId");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (leagueId && userId) {
      loadPicks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, stage]);

  async function loadPicks() {
  if (!leagueId) {
    setError("Missing league ID.");
    return;
  }

  if (!userId) {
    setError("You must be logged in to view league picks.");
    return;
  }

  try {
    setLoading(true);
    setError("");
    setExpandedMatch(null);

    const result = await getLeaguePicks(leagueId, stage, userId);

    setData(result);
    setError("");
  } catch (err) {
    console.error(err);
    setData(null);
    setError(err.message || "Could not load league picks.");
  } finally {
    setLoading(false);
  }
}

const filteredMatches =
  data?.matches?.filter((match) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "finished") return match.status === "FINISHED";
    if (statusFilter === "scheduled") return match.status !== "FINISHED";
    return true;
  }) || [];

  return (
    <div className="league-picks-page">
      <h1 className="page-title">League Picks</h1>
      <p className="page-subtitle">
        See everyone&apos;s picks for each match after the stage locks.
      </p>

      <div className="league-picks-controls">
        <select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="group-stage">Group Stage</option>
          <option value="round-of-32">Round of 32</option>
          <option value="round-of-16">Round of 16</option>
          <option value="quarterfinal">Quarterfinals</option>
          <option value="semifinal">Semifinals</option>
          <option value="final">Final</option>
        </select>

        <button onClick={loadPicks} disabled={loading}>
          {loading ? "Loading..." : "Refresh Picks"}
        </button>
      </div>

      <div className="pick-filter-toggle">
        <button
            className={statusFilter === "all" ? "active" : ""}
            onClick={() => setStatusFilter("all")}
        >
            All
        </button>

        <button
            className={statusFilter === "scheduled" ? "active" : ""}
            onClick={() => setStatusFilter("scheduled")}
        >
            Scheduled
        </button>

        <button
            className={statusFilter === "finished" ? "active" : ""}
            onClick={() => setStatusFilter("finished")}
        >
            Finished
        </button>
        </div>
        <br></br>

      {error && <p className="error-message">{error}</p>}

      {loading && <p className="muted">Loading league picks...</p>}

      {data && !data.locked && (
        <div className="locked-card">
          <h2>Picks Hidden</h2>
          <p>{data.message}</p>
        </div>
      )}

      {data?.locked && filteredMatches.length === 0 && (
        <div className="locked-card">
          <h2>No Matches Found</h2>
          <p>No matches were found for this stage.</p>
        </div>
      )}

      {data?.locked && filteredMatches.length > 0 && (
        <div className="match-picks-list">
            {filteredMatches.map((match) => {
          
            const isExpanded = expandedMatch === match.matchId;

            return (
              <div
                key={match.matchId}
                className={`match-pick-card ${match.isNextMatch ? "next-match-card" : ""}`}
                >
                <div className="match-pick-header">
                {match.isNextMatch && <span className="next-match-badge">Next Match</span>}
                    
                  <h2>
                    {match.homeTeam} vs {match.awayTeam}
                  </h2>
                  <p>{formatDate(match.utcDate)}</p>
                  <p>{match.status}</p>
                </div>

                <div className="pick-count-grid">
                  <div>
                    <strong>{match.homeTeam}</strong>
                    <span>{match.pickCounts.home} picks</span>
                  </div>

                  <div>
                    <strong>Draw</strong>
                    <span>{match.pickCounts.draw} picks</span>
                  </div>

                  <div>
                    <strong>{match.awayTeam}</strong>
                    <span>{match.pickCounts.away} picks</span>
                  </div>
                </div>

                <p className="muted">
                  {match.totalPicks} total pick
                  {match.totalPicks === 1 ? "" : "s"} submitted
                </p>

                <button
                  className="secondary-button"
                  onClick={() =>
                    setExpandedMatch(isExpanded ? null : match.matchId)
                  }
                >
                  {isExpanded ? "Hide Picks" : "Show Picks"}
                </button>

                {isExpanded && (
                  <div className="expanded-picks">
                    <PickGroup label={match.homeTeam} users={match.picks.home} />
                    <PickGroup label="Draw" users={match.picks.draw} />
                    <PickGroup label={match.awayTeam} users={match.picks.away} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PickGroup({ label, users }) {
  return (
    <div className="pick-group">
      <h3>{label}</h3>

      {users.length === 0 ? (
        <p className="muted">No picks</p>
      ) : (
        <div className="user-chip-list">
          {users.map((user) => (
            <span key={user} className="user-chip">
              {user}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}