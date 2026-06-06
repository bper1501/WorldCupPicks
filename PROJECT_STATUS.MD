# World Cup Picks Status

## Completed

* Create league endpoint
* Join league via invite code
* Submit picks
* Lockout logic
* Get matches by stage
* Get user leagues
* Get picks
* Update match result
* Calculate stage scores
* Partial stage scoring
* Sync World Cup matches (2026)
* Sync World Cup results
* Dashboard endpoint
* Admin route protection
* Frontend API layer
* JoinLeague.jsx connected
* CreateLeague.jsx connected
* Dashboard.jsx connected
* SubmitPicks.jsx connected
* Existing picks auto-load
* Edit/re-submit picks working
* Query params auto-populate SubmitPicks

## Current Frontend Status

* React/Vite working
* React Router working
* JoinLeague working end-to-end
* CreateLeague working end-to-end
* Dashboard loading user leagues
* SubmitPicks loading matches dynamically
* SubmitPicks saving picks to Firestore
* Existing picks auto-populating
* SubmitPicks auto-filled from Dashboard links

## Current Routes

* `/` → JoinLeague
* `/create-league` → CreateLeague
* `/dashboard` → Dashboard
* `/submit-picks` → SubmitPicks

## Current User Flow

1. Join League OR Create League
2. Open Dashboard
3. Load user leagues
4. Click Submit Picks
5. SubmitPicks auto-populates league/user/stage
6. Load matches
7. Existing picks auto-load (if present)
8. Submit or edit picks

## Next Steps

1. Build Leaderboard.jsx
2. Add leaderboard navigation from Dashboard
3. Show current stage + lock status on Dashboard
4. Show submitted/not submitted status by stage
5. Mobile-first UI improvements
6. Future: Authentication / Sign-In page

## Firestore Structure

leagues/

matches/

picks/{leagueId}/{stage}/{userId}

scores/{leagueId}/{stage}/{userId}

stages/

results/{stage}/{matchId}
