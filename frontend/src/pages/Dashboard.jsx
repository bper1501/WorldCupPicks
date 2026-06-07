import { useState } from "react";
import { Link } from "react-router-dom";
import { getUserLeagues, getCurrentStage, getPicks } from "../api/api";

function Dashboard() {
  const [userId, setUserId] = useState("");
  const [currentStage, setCurrentStage] = useState("group-stage");
  const [currentStageDisplay, setCurrentStageDisplay] = useState("Group Stage");
  const [pickStatuses, setPickStatuses] = useState({});
  const [leagues, setLeagues] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageStatus, setStageStatus] = useState({
  isLocked: false,
  isFinalized: false,
  lockTime: null
  });

 async function handleLoadLeagues(e) {
  e.preventDefault();

  setError("");
  setLoading(true);
  setLeagues([]);
  setPickStatuses({});

  try {
    const stageData = await getCurrentStage();
    console.log("Current stage response:", stageData);

    const activeStage = stageData.currentStage || "group-stage";
    const activeStageDisplay =
      stageData.currentStageDisplay || activeStage;

    setCurrentStage(activeStage);
    setCurrentStageDisplay(activeStageDisplay);

    setStageStatus({
    isLocked: stageData.isLocked ?? false,
    isFinalized: stageData.isFinalized ?? false,
    lockTime: stageData.lockTime || null
    });

    const data = await getUserLeagues(userId);
    console.log("User leagues response:", data);

    const loadedLeagues = Array.isArray(data)
      ? data
      : data.leagues || [];

    setLeagues(loadedLeagues);

    const statuses = {};

    await Promise.all(
      loadedLeagues.map(async (league) => {
        const leagueId = league.leagueId || league.id;

        try {
          const picksData = await getPicks({
            leagueId,
            stage: activeStage,
            userId
          });

          statuses[leagueId] =
            picksData.picks && picksData.picks.length > 0
              ? "Submitted ✅"
              : "Not Submitted ❌";
        } catch {
          statuses[leagueId] = "Not Submitted ❌";
        }
      })
    );

    setPickStatuses(statuses);
  } catch (err) {
    setError(err.message);
    setLeagues([]);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <p>
        <strong>Current Stage:</strong> {currentStageDisplay}
      </p>
      <p>
        <strong>Stage Status:</strong>{" "}
        {stageStatus.isFinalized
          ? "Finalized 🏁"
          : stageStatus.isLocked
          ? "Locked 🔒"
          : "Open for Picks 🟢"}
      </p>
      {stageStatus.lockTime && (
      <p>
        <strong>Lock Time:</strong>{" "}
        {stageStatus.lockTime._seconds
          ? new Date(stageStatus.lockTime._seconds * 1000).toLocaleString()
          : String(stageStatus.lockTime)}
      </p>
      )}

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
        <div className="card card-accent" key={league.leagueId || league.id}>
          <h3>{league.leagueName || league.name}</h3>

          <p>
            <strong>League ID:</strong>{" "}
            {league.leagueId || league.id}
          </p>

          <p>
            <strong>Invite Code:</strong>{" "}
            {league.inviteCode}
          </p>
          <p>
            <strong>Picks:</strong>{" "}
            {pickStatuses[league.leagueId || league.id] || "Checking..."}
          </p>
          <Link className="button-link" to={`/submit-picks?leagueId=${league.leagueId || league.id}&userId=${userId}&stage=${currentStage}`}>
            Submit Picks
          </Link>
          <br />
          <Link className="button-link" to={`/leaderboard?leagueId=${league.leagueId || league.id}&stage=${currentStage}`}>
            View Leaderboard
          </Link>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;