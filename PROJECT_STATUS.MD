# World Cup Picks Status

## Completed
- Create league endpoint
- Join league via invite code
- Submit picks
- Lockout logic
- Get matches by stage
- Get user leagues
- Get picks
- Update match result
- Calculate stage scores
- Frontend API layer
- JoinLeague.jsx connected

## Current Frontend Status
- React/Vite working
- JoinLeague working end-to-end
- App.jsx rendering JoinLeague

## Next Steps
1. Connect CreateLeague.jsx
2. Add navigation between pages
3. Build Dashboard
4. Build Submit Picks page
5. Build Leaderboard

## Firestore Structure
leagues/
matches/
picks/{leagueId}/{stage}/{userId}
scores/{leagueId}/{stage}/{userId}
stages/