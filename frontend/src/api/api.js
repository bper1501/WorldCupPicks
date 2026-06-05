const API_BASE_URL = "http://localhost:5001";

// Reusable helper for handling API responses
async function handleResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

// Create league
export async function createLeague({ leagueName, userId }) {
  const response = await fetch(`${API_BASE_URL}/create-league`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ leagueName, userId })
  });

  return handleResponse(response);
}

// Join league by invite code
export async function joinLeague({ inviteCode, userId }) {
  const response = await fetch(`${API_BASE_URL}/join-league`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inviteCode, userId })
  });

  return handleResponse(response);
}

// Get leagues for a user
export async function getUserLeagues(userId) {
  const response = await fetch(`${API_BASE_URL}/user-leagues/${userId}`);
  return handleResponse(response);
}

// Get matches by stage
export async function getMatchesByStage(stage) {
  const response = await fetch(`${API_BASE_URL}/matches/${stage}`);
  return handleResponse(response);
}

// Submit picks
export async function submitPicks({
  leagueId,
  userId,
  stage,
  picks,
  tiebreakerGoals
}) {
  const response = await fetch(`${API_BASE_URL}/submit-picks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      leagueId,
      userId,
      stage,
      picks,
      tiebreakerGoals
    })
  });

  return handleResponse(response);
}

// Get saved picks
export async function getPicks({ leagueId, stage, userId }) {
  const response = await fetch(
    `${API_BASE_URL}/picks/${leagueId}/${stage}/${userId}`
  );

  return handleResponse(response);
}

// Calculate stage scores
export async function calculateStageScores({ leagueId, stage }) {
  const response = await fetch(`${API_BASE_URL}/calculate-stage-scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ leagueId, stage })
  });

  return handleResponse(response);
}