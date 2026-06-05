const API_BASE_URL = "http://localhost:5001";

export async function getDashboard(leagueId, userId) {
  const response = await fetch(`${API_BASE_URL}/dashboard/${leagueId}/${userId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard");
  }

  return response.json();
}