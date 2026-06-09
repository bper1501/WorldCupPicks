// src/pages/SubmitPicks.jsx
import { useEffect, useRef, useState } from "react";
import { getMatchesByStage, getPicks, submitPicks, getCurrentStage } from "../api/api";
import { useSearchParams } from "react-router-dom";

function SubmitPicks() {
 const [searchParams] = useSearchParams();

  const leagueIdFromUrl = searchParams.get("leagueId") || "";
  // const userIdFromUrl = searchParams.get("userId") || "";
  const userIdFromStorage = localStorage.getItem("worldCupUserId") || "";
  const stageFromUrl = searchParams.get("stage") || "group-stage";
  const leagueNameFromUrl =
  searchParams.get("leagueName") || "";
  const matchRefs = useRef({});

  // const hasUrlParams = Boolean(
  // leagueIdFromUrl && userIdFromUrl && stageFromUrl
  // );

  const hasUrlParams = Boolean(
  leagueIdFromUrl && userIdFromStorage && stageFromUrl
);

  const [leagueId, setLeagueId] = useState(leagueIdFromUrl);
  // const [userId, setUserId] = useState(userIdFromUrl);
  const [userId] = useState(userIdFromStorage);
  const [stage, setStage] = useState(stageFromUrl);
  const [matches, setMatches] = useState([]);
  const [picks, setPicks] = useState({});
  const [tiebreakerGoals, setTiebreakerGoals] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stageStatus, setStageStatus] = useState({
    isLocked: false,
    isFinalized: false,
    lockTime: null
  });

  const picksLocked =
  stageStatus.isLocked || stageStatus.isFinalized;


//Change "group-stage" to "Group Stage" etc.
  function formatStageName(stageValue) {
  return stageValue
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

//Format stage name for display
const stageDisplayName = formatStageName(stage);

//Calculate how many picks have been made out of total matches for progress display
const picksMade = Object.values(picks).filter(Boolean).length;
const totalMatches = matches.length;

//Change "GROUP_A" to "Group A", "ROUND_OF_16" to "Round of 16", etc. If no group, return "Other Matches"
function formatGroupName(groupValue) {
  if (!groupValue) return "Other Matches";

  return groupValue
    .replace("GROUP_", "Group ")
    .replace("_", " ");
}

//Group matches by their group (e.g. Group A, Group B, etc.)
function groupMatchesByGroup(matchesList) {
  return matchesList.reduce((acc, match) => {
    const groupName = formatGroupName(match.group);

    if (!acc[groupName]) {
      acc[groupName] = [];
    }

    acc[groupName].push(match);
    return acc;
  }, {});
}

const groupedMatches = groupMatchesByGroup(matches);

//Render matches grouped by their group with a header for each group
  async function handleSubmitPicks(e) {
    e.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const formattedPicks = matches.map((match) => ({
        matchId: match.id,
        pick: picks[match.id]
      }));

      await submitPicks({
        leagueId,
        userId,
        stage,
        picks: formattedPicks,
        tiebreakerGoals: Number(tiebreakerGoals)
      });

      setMessage("Picks submitted successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

function handlePickChange(matchId, value) {
  setPicks((prev) => ({
    ...prev,
    [String(matchId)]: value
  }));

  const currentIndex = matches.findIndex(
    (match) => String(match.id) === String(matchId)
  );

  const nextMatch = matches[currentIndex + 1];

  if (nextMatch) {
    setTimeout(() => {
      matchRefs.current[String(nextMatch.id)]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 200);
  }
}

const formattedPicks = matches.map((match) => ({
  matchId: String(match.id),
  pick: picks[String(match.id)]
}));

async function loadMatchesAndPicks() {
  setError("");
  setMessage("");
  setLoadingMatches(true);
  setMatches([]);
  setPicks({});
  setTiebreakerGoals("");

  try {
    const data = await getMatchesByStage(stage);

    const loadedMatches = Array.isArray(data)
      ? data
      : data.matches || [];

    setMatches(loadedMatches);

    try {
      const stageData = await getCurrentStage();

      setStageStatus({
        isLocked: stageData.isLocked ?? false,
        isFinalized: stageData.isFinalized ?? false,
        lockTime: stageData.lockTime || null
      });

      const data = await getMatchesByStage(stage);

      const loadedMatches = Array.isArray(data)
        ? data
        : data.matches || [];

      setMatches(loadedMatches);

      const savedData = await getPicks({
        leagueId,
        stage,
        userId
      });

      const savedPicksArray = savedData.picks || [];

      const savedPicksObject = savedPicksArray.reduce((acc, item) => {
        acc[String(item.matchId)] = item.pick;
        return acc;
      }, {});

      setPicks(savedPicksObject);

      if (savedData.tiebreakerGoals !== undefined) {
        setTiebreakerGoals(String(savedData.tiebreakerGoals));
      }

      setMessage("Existing picks loaded.");
    } catch {
      setMessage("No existing picks found. Make your selections below.");
    }
  } catch (err) {
    setError(err.message);
    setMatches([]);
  } finally {
    setLoadingMatches(false);
  }
}

// async function handleLoadMatches(e) {
//   e.preventDefault();

//   setError("");
//   setMessage("");
//   setLoadingMatches(true);
//   setMatches([]);
//   setPicks({});
//   setTiebreakerGoals("");

//   try {
//     const data = await getMatchesByStage(stage);

//     const loadedMatches = Array.isArray(data)
//       ? data
//       : data.matches || [];

//     setMatches(loadedMatches);

//     try {
//       const savedData = await getPicks({
//         leagueId,
//         stage,
//         userId
//       });

//       const savedPicksArray = savedData.picks || [];

//     //   const savedPicksObject = savedPicksArray.reduce((acc, item) => {
//     //     acc[item.matchId] = item.pick;
//     //     return acc;
//     //   }, {});

//       const savedPicksObject = savedPicksArray.reduce((acc, item) => {
//         acc[String(item.matchId)] = item.pick;
//         return acc;
//       }, {});

//       setPicks(savedPicksObject);

//       if (savedData.tiebreakerGoals !== undefined) {
//         setTiebreakerGoals(String(savedData.tiebreakerGoals));
//       }

//       setMessage("Existing picks loaded.");
//     } catch {
//       setMessage("No existing picks found. Make your selections below.");
//     }
//   } catch (err) {
//     setError(err.message);
//     setMatches([]);
//   } finally {
//     setLoadingMatches(false);
//   }
// }

async function handleLoadMatches(e) {
  e.preventDefault();
  await loadMatchesAndPicks();
}

useEffect(() => {
  if (leagueId && userId && stage) {
    loadMatchesAndPicks();
  }
}, []);



  return (
    <div className="page">
      <h1 className="page-title">Submit Picks</h1>

    {!hasUrlParams && (
      <form onSubmit={handleLoadMatches}>
        <div>
          <label>League ID</label>
          <input
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            required
          />
        </div>

        <div>
          <label>User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Stage</label>
          <input
            value={stageDisplayName}
            onChange={(e) => setStage(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loadingMatches}>
          {loadingMatches ? "Loading..." : "Load Matches"}
        </button>
      </form>
    )}


    {hasUrlParams && (
      <div>
        <p>
          <strong>League:</strong>{" "}
          {leagueNameFromUrl || leagueId}
        </p>
        <p>
          <strong>Stage:</strong> {stageDisplayName}
        </p>
      </div>
    )}

    {picksLocked && (
      <div className="lock-banner">
        <strong>
          {stageStatus.isFinalized
            ? "Stage finalized 🏁"
            : "Picks locked 🔒"}
        </strong>
        <p>
          You can view your picks, but changes can no longer be submitted.
        </p>
      </div>
    )}

      {matches.length > 0 && (
        <div className="sticky-progress">
          <p>
            <strong>Progress:</strong> {picksMade} of {totalMatches} picks made
          </p>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${totalMatches ? (picksMade / totalMatches) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <form onSubmit={handleSubmitPicks}>
          <h2>{stageDisplayName} Matches</h2>
  

          {/* {matches.map((match) => (
            <div
              className="match-card"
              key={match.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px"
              }}
              ref={(el) => {
              matchRefs.current[String(match.id)] = el;
              }}
            >

            <div className="match-header">
              <span>{match.teamA}</span>
              <span className="vs-text">VS</span>
              <span>{match.teamB}</span>
            </div>

              <label className="pick-option">
                <input
                  type="radio"
                  name={match.id}
                  value="HOME"
                  //checked={picks[match.id] === "HOME"}
                  checked={picks[String(match.id)] === "HOME"}
                  onChange={() =>
                    handlePickChange(match.id, "HOME")
                  }
                  required
                />
                {match.teamA}
              </label>

              <br />

              <label className="pick-option">
                <input
                  type="radio"
                  name={match.id}
                  value="DRAW"
                  //checked={picks[match.id] === "DRAW"}
                  checked={picks[String(match.id)] === "DRAW"}
                  onChange={() =>
                    handlePickChange(match.id, "DRAW")
                  }
                />
                Draw
              </label>

              <br />

              <label className="pick-option">
                <input
                  type="radio"
                  name={match.id}
                  value="AWAY"
                  //checked={picks[match.id] === "AWAY"}
                  checked={picks[String(match.id)] === "AWAY"}
                  onChange={() =>
                    handlePickChange(match.id, "AWAY")
                  }
                />
                {match.teamB}
              </label>
            </div>
          ))} */}

          {/* Render matches grouped by their group (e.g. Group A, Group B, etc.) with a header for each group */}
          {Object.entries(groupedMatches).map(([groupName, groupMatches]) => (
            <section key={groupName}>
              <h3 className="group-heading">{groupName}</h3>

              {groupMatches
                .sort(
                  (a, b) =>
                    new Date(a.kickoffTime) - new Date(b.kickoffTime)
                )
                .map((match) => (
                  <div
                    className="match-card"
                    key={match.id}
                    ref={(el) => {
                      matchRefs.current[String(match.id)] = el;
                    }}
                  >
                    <div className="match-header">
                      <span>{match.teamA || match.homeTeam}</span>
                      <span className="vs-text">VS</span>
                      <span>{match.teamB || match.awayTeam}</span>
                    </div>

                    {match.kickoffTime && (
                      <p className="match-time">
                        {new Date(match.kickoffTime).toLocaleString()}
                      </p>
                    )}

                    <label className="pick-option">
                      <input
                        type="radio"
                        name={match.id}
                        value="HOME"
                        checked={picks[String(match.id)] === "HOME"}
                        disabled={picksLocked}
                        onChange={() => handlePickChange(match.id, "HOME")}
                        required
                      />
                      {match.teamA || match.homeTeam}
                    </label>

                    <label className="pick-option">
                      <input
                        type="radio"
                        name={match.id}
                        value="DRAW"
                        checked={picks[String(match.id)] === "DRAW"}
                        disabled={picksLocked}
                        onChange={() => handlePickChange(match.id, "DRAW")}
                      />
                      Draw
                    </label>

                    <label className="pick-option">
                      <input
                        type="radio"
                        name={match.id}
                        value="AWAY"
                        checked={picks[String(match.id)] === "AWAY"}
                        disabled={picksLocked}
                        onChange={() => handlePickChange(match.id, "AWAY")}
                      />
                      {match.teamB || match.awayTeam}
                    </label>
                  </div>
                ))}
            </section>
          ))}

          <div>
            <label>Tiebreaker Goals</label>
            <input
              type="number"
              value={tiebreakerGoals}
              onChange={(e) =>
                setTiebreakerGoals(e.target.value)
              }
              required
            />
          </div>

          <button className="sticky-submit" type="submit" disabled={submitting || picksLocked}>
            {submitting ? "Submitting..." : picksLocked ? "Picks Locked" : "Submit Picks"}
          </button>
        </form>
      )}

      {message && (
        <p style={{ color: "green" }}>{message}</p>
      )}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}
    </div>
  );
}

export default SubmitPicks;