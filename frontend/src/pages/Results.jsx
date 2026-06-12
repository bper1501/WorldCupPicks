import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getUserResults } from "../api/api";

function Results() {
  const [searchParams] = useSearchParams();

  const leagueId = searchParams.get("leagueId");
  const leagueName = searchParams.get("leagueName");
  const stage = searchParams.get("stage") || "group-stage";
  const userId = localStorage.getItem("worldCupUserId");

  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

// Helper function to format stage names from URL parameters
function formatStageName(stageValue) {
return stageValue
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const finishedResults =
resultsData?.results?.filter(
    (match) => match.status === "FINISHED"
) || [];


  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setMessage("");

        const data = await getUserResults({
          leagueId,
          stage,
          userId
        });

        setResultsData(data);
      } catch (error) {
        setMessage(error.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }

    if (leagueId && stage && userId) {
      loadResults();
    } else {
      setLoading(false);
      setMessage("Missing league, stage, or user information.");
    }
  }, [leagueId, stage, userId]);

  if (loading) {
    return (
      <main className="page">
        <p>Loading results...</p>
      </main>
    );
  }
  
  return (
    <main className="page">
      <h1 className="page-title">My Results</h1>

      <p className="dashboard-summary">
        {leagueName || "Current League"} · {formatStageName(stage)}
      </p>

      <Link className="button-link" to="/dashboard">
        Back to Dashboard
      </Link>

      {message && (
        <div className="empty-state">
          <p>{message}</p>
        </div>
      )}

      {resultsData?.score && !resultsData.score.message && (
        <section className="summary-card">
          <h2>Score Summary</h2>
          <p>
            <strong>{resultsData.score.totalPoints ?? 0}</strong> total points
          </p>
          <p>Match points: {resultsData.score.matchPoints ?? 0}</p>
          {/* <p>Tiebreaker points: {resultsData.score.tiebreakerPoints ?? 0}</p> */}
        </section>
      )}

        {finishedResults.length > 0 ? (
            <section className="results-list">
            {finishedResults.map((match) => (
                <div   className={`result-card ${
                    match.correct ? "correct-card" : "incorrect-card"
                    }`}
                key={match.matchId}>
                    <div className="result-card-header">
                        <h3>
                        {match.teamA || "TBD"} vs {match.teamB || "TBD"}
                        </h3>

                        <span
                        className={`result-badge ${
                            match.correct ? "correct" : "incorrect"
                        }`}
                        >
                        {match.correct ? "Correct ✅" : "Incorrect ❌"}
                        </span>
                    </div>

                    <div className="result-detail-list">
                        <div className="result-detail-row">
                        <span>Final</span>
                        <strong>{match.homeGoals ?? "-"} - {match.awayGoals ?? "-"}</strong>
                        </div>

                        <div className="result-detail-row">
                        <span>Your pick</span>
                        <strong>{match.userPick}</strong>
                        </div>

                        <div className="result-detail-row">
                        <span>Winner</span>
                        <strong>{match.actualWinner || "Not available"}</strong>
                        </div>

                        <div className="result-detail-row">
                        <span>Points</span>
                        <strong>+{match.pointsEarned ?? 0}</strong>
                        </div>
                    </div>
                </div>
          ))}
        </section>
      ) : (
        !message && (
          <div className="empty-state">
            <p>No finished match results yet. Check back after kickoff.</p>
          </div>
        )
      )}
    </main>
  );
}

export default Results;