import { useState } from "react";
import { createLeague } from "../api/api";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function CreateLeague() {
  const [leagueName, setLeagueName] = useState("");
  // const [userId, setUserId] = useState(""); // We will get this from localStorage instead of user input
  const userId = localStorage.getItem("worldCupUserId");
  const [createdLeague, setCreatedLeague] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setCreatedLeague(null);
    setLoading(true);

    if (!userId) {
      setError("You must be logged in to create a league.");
      return;
    }

    try {
      const data = await createLeague({
        leagueName,
        userId
      });

      setCreatedLeague(data);
      setLeagueName("");

      localStorage.setItem("worldCupUserId", userId);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
  <div className="page">
    <h1 className="page-title">Create League</h1>

    <div className="card card-accent">
      <h2>Start a New Pool</h2>

      <p>
        Create a league, invite friends, and compete through each World Cup stage.
      </p>

      <p className="league-meta">
        <strong>Signed in as:</strong> {userId}
      </p>

      <form onSubmit={handleSubmit}>
        <label>League Name</label>

        <input
          type="text"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          placeholder="World Cup Pool"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create League"}
        </button>
      </form>
    </div>

    {error && <p style={{ color: "red" }}>{error}</p>}

    <div className="league-actions">
      <Link className="button-link secondary-button" to="/">
        Join a League
      </Link>

      <Link className="button-link" to="/dashboard">
        Back to Dashboard
      </Link>
    </div>
  </div>
  );
}

export default CreateLeague;