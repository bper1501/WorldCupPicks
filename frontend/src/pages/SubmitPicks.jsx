// src/pages/SubmitPicks.jsx
import { useEffect, useState } from "react";
import { getMatchesByStage, getPicks, submitPicks } from "../api/api";
import { useSearchParams } from "react-router-dom";

function SubmitPicks() {
 const [searchParams] = useSearchParams();

  const leagueIdFromUrl = searchParams.get("leagueId") || "";
  const userIdFromUrl = searchParams.get("userId") || "";
  const stageFromUrl = searchParams.get("stage") || "group-stage";

  const hasUrlParams = Boolean(
  leagueIdFromUrl && userIdFromUrl && stageFromUrl
  );

  const [leagueId, setLeagueId] = useState(leagueIdFromUrl);
  const [userId, setUserId] = useState(userIdFromUrl);
  const [stage, setStage] = useState(stageFromUrl);
  const [matches, setMatches] = useState([]);
  const [picks, setPicks] = useState({});
  const [tiebreakerGoals, setTiebreakerGoals] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);


//Change "group-stage" to "Group Stage" etc.
  function formatStageName(stageValue) {
  return stageValue
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

//Format stage name for display
const stageDisplayName = formatStageName(stage);

const picksMade = Object.values(picks).filter(Boolean).length;
const totalMatches = matches.length;

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
          <strong>League ID:</strong> {leagueId}
        </p>
        <p>
          <strong>Stage:</strong> {stageDisplayName}
        </p>
      </div>
    )}

      {matches.length > 0 && (
        <form onSubmit={handleSubmitPicks}>
          <h2>{stageDisplayName} Matches</h2>
          <p>
            <strong>Progress:</strong> {picksMade} of {totalMatches} picks made
          </p>

          <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${(picksMade / totalMatches) * 100}%`
            }}
          />
        </div>

          {matches.map((match) => (
            <div
              className="match-card"
              key={match.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px"
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

          <button className="sticky-submit" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Picks"}
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