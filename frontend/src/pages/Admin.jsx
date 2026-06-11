import { useState } from "react";
import { API_BASE_URL } from "../api/api";

function Admin() {
  const userId = localStorage.getItem("worldCupUserId");
  const [leagueId, setLeagueId] = useState("");
  const [stage, setStage] = useState("group-stage");
  const [message, setMessage] = useState("");

  async function runAction(endpoint, body = {}) {
    setMessage("Running...");

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          leagueId,
          stage,
          ...body
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Action failed");
        return;
      }

      setMessage(data.message || "Action completed");
    } catch (error) {
      console.error(error);
      setMessage("Request failed");
    }
  }

  return (
    <div className="page">
      <h1>Admin Controls</h1>

      <label>
        League ID
        <input
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          placeholder="League ID"
        />
      </label>

      <label>
        Stage
        <select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="group-stage">Group Stage</option>
          <option value="round-of-32">Round of 32</option>
          <option value="round-of-16">Round of 16</option>
          <option value="quarter-finals">Quarter Finals</option>
          <option value="semi-finals">Semi Finals</option>
          <option value="third-place">Third Place</option>
          <option value="final">Final</option>
        </select>
      </label>

      <button onClick={() => runAction("/sync-worldcup-results")}>
        Sync World Cup Results
      </button>

      <button onClick={() => runAction("/partial-score")}>
        Run Partial Score
      </button>

      <button onClick={() => runAction("/calculate-stage-scores")}>
        Calculate Final Stage Scores
      </button>

      <button onClick={() => runAction("/finalize-stage")}>
        Finalize Stage
      </button>

      <button onClick={() => runAction("/set-current-stage")}>
        Set Current Stage
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default Admin;