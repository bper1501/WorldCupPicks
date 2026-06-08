import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserLeagues, getCurrentStage, getPicks } from "../api/api";

function Dashboard() {
  //const [userId, setUserId] = useState("");
  const [userId, setUserId] = useState(() => {
  return localStorage.getItem("worldCupUserId") || "";
  });
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
    localStorage.setItem("worldCupUserId", userId);
  } catch (err) {
    setError(err.message);
    setLeagues([]);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    if (userId) {
      handleLoadLeagues({ preventDefault: () => {} });
    }
  }, []);

function handleLogout() {
  localStorage.removeItem("worldCupUserId");

  setUserId("");
  setLeagues([]);
  setPickStatuses({});
  setCurrentStage("group-stage");
  setCurrentStageDisplay("Group Stage");

  setStageStatus({
    isLocked: false,
    isFinalized: false,
    lockTime: null
  });
}


  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      {/* <p>
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
      )} */}

      <div className="dashboard-summary">
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

        <div className="logged-in-user">
          <strong>Signed in as:</strong> {userId}
        </div>
      </div>

      <div className="league-actions">
        <Link className="button-link" to="/create-league">
          Create League
        </Link>

        <Link className="button-link secondary-button" to="/">
          Join League
        </Link>

        <button
          className="button-link secondary-button"
          onClick={handleLogout}
        >
          Switch User
        </button>
      </div>
      <br />

    {leagues.length === 0 && (
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
    )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    {leagues.length > 0 && (
      <>
        <h2>My Leagues</h2>

        {leagues.map((league) => {
          const leagueId = league.leagueId || league.id;

          return (
            <div className="league-card" key={leagueId}>
              <h3>{league.leagueName || league.name}</h3>

              <p className="league-meta">
                <strong>Picks:</strong>{" "}
                {pickStatuses[leagueId] || "Checking..."}
              </p>

              <p className="league-meta">
                <strong>Invite Code:</strong> {league.inviteCode}
              </p>

              <div className="league-actions">
                {/* <Link
                  className="button-link"
                  to={`/submit-picks?leagueId=${leagueId}&userId=${userId}&stage=${currentStage}`}
                >
                  Submit Picks
                </Link> */}

                <Link
                  className="button-link"
                  to={`/submit-picks?leagueId=${leagueId}&leagueName=${encodeURIComponent(
                    league.leagueName || league.name
                  )}&userId=${userId}&stage=${currentStage}`}
                >
                  Submit Picks
                </Link>


                {/* <Link
                  className="button-link secondary-button"
                  to={`/leaderboard?leagueId=${leagueId}&stage=${currentStage}`}
                >
                  Leaderboard
                </Link> */}

                <Link
                  className="button-link secondary-button"
                  to={`/leaderboard?leagueId=${leagueId}&leagueName=${encodeURIComponent(
                    league.leagueName || league.name
                  )}&stage=${currentStage}`}
                >
                  Leaderboard
                </Link>
              </div>
            </div>
          );
        })}
      </>
    )}
    
    </div>
)}


export default Dashboard;