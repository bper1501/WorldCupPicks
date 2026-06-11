import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserLeagues, getCurrentStage, getPicks } from "../api/api";


function Dashboard() {
  const navigate = useNavigate();
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

  // useEffect(() => {
  //   if (userId) {
  //     handleLoadLeagues({ preventDefault: () => {} });
  //   }
  // }, []);

  useEffect(() => {
  if (userId) {
    handleLoadLeagues({
      preventDefault: () => {}
    });
  }
}, [userId]);

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

//Now being handled by ProtectedRoute
// useEffect(() => {
//   const storedUserId = localStorage.getItem("worldCupUserId");

//   if (!storedUserId) {
//     navigate("/login");
//   }
// }, [navigate]);


  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

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
          🏆 Create League
        </Link>

        <Link className="button-link secondary-button" to="/">
          👥 Join League
        </Link>

      </div>
      <br />


      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Loading your leagues...</p>}

      
      {!loading && leagues.length === 0 && (
        <div className="card">
          <h3>No leagues yet</h3>

          <p>
            Create a league or join one with an invite code to get started.
          </p>

          <div className="league-actions">
            <Link className="button-link" to="/create-league">
              🏆 Create League
            </Link>

            <Link
              className="button-link secondary-button"
              to="/"
            >
              👥 Join League
            </Link>
          </div>
        </div>
      )}
    {leagues.length > 0 && (
      <>
        <h2>My Leagues</h2>

        {leagues.map((league) => {
          const leagueId = league.leagueId || league.id;

          return (
            <div className="league-card" key={leagueId}>
              <h3 className="league-title">
                {league.leagueName || league.name}
              </h3>

            <div className="league-status-row">
              <span
                className={`status-chip ${
                  pickStatuses[leagueId] === "Submitted ✅"
                    ? "submitted"
                    : "missing"
                }`}
              >
                {pickStatuses[leagueId] === "Submitted ✅"
                  ? "Picks Submitted"
                  : "Missing Picks"}
              </span>
            </div>

            <p className="league-invite">
              Invite Code •{" "}
              <strong>{league.inviteCode}</strong>
            </p>

              <div className="league-actions">

                <Link
                  className="button-link"
                  to={`/submit-picks?leagueId=${leagueId}&leagueName=${encodeURIComponent(
                    league.leagueName || league.name
                  )}&stage=${currentStage}`}
                >
                  ✏️ Submit Picks
                </Link>

                <Link
                  className="button-link accent-button"
                  to={`/leaderboard?leagueId=${leagueId}&leagueName=${encodeURIComponent(
                    league.leagueName || league.name
                  )}&stage=${currentStage}`}
                >
                   🏅 Leaderboard
                </Link>
                <Link
                  className="button-link"
                  to={`/results?leagueId=${leagueId}&leagueName=${encodeURIComponent(
                    league.leagueName || league.name
                  )}&stage=${currentStage}`}
                >
                  ✅ View My Results
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