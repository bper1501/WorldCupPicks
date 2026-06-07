import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { db } from "./firebase.js";
import admin from "firebase-admin";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());


//Admin check function - checks if userId is in ADMIN_USERS env variable
function isAdmin(userId) {
  const admins = process.env.ADMIN_USERS
    ? process.env.ADMIN_USERS.split(",").map(admin => admin.trim())
    : [];

  return admins.includes(userId);
}

//admin check middleware for routes that require admin access
function requireAdmin(req, res) {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({
      error: "userId is required for admin actions"
    });
    return false;
  }

  if (!isAdmin(userId)) {
    res.status(403).json({
      error: "Admin access required"
    });
    return false;
  }

  return true;
}


// Use environment variable PORT if set, fallback to 5000
const PORT = process.env.PORT || 5001;
console.log("PORT BEING USED: " + PORT)

// Start server with safety check
app.listen(PORT)
  .on("listening", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Try changing PORT.`);
    } else {
      console.error(err);
    }
  });

  // Test route to check Firebase
app.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("test").get();
    res.send(`Firebase connected! Found ${snapshot.size} documents.`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Firebase connection failed");
  }
});
app.get("/test-firebase", async (req, res) => {
  try {
    const snapshot = await db.collection("test").get();
    res.send(`Firebase connected! Found ${snapshot.size} documents. In /test-firebase route`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Firebase connection failed");
  }
});


  // Helper function to generate a random league code
function generateLeagueCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to map football-data.org stages to our internal stage names
function mapStage(apiStage) {
  const stageMap = {
    GROUP_STAGE: "group-stage",
    LAST_32: "round-of-32",
    LAST_16: "round-of-16",
    QUARTER_FINALS: "quarter-finals",
    SEMI_FINALS: "semi-finals",
    THIRD_PLACE: "third-place",
    FINAL: "final"
  };

  return stageMap[apiStage] || "unknown";
}

// CREATE LEAGUE endpoint
//http://localhost:5001/create-league
/*
{
  "leagueName" : "",
  "userId" : ""
}
*/

app.post("/create-league", async (req, res) => {
  try {
    const { leagueName, userId } = req.body;
    if (!leagueName || !userId) return res.status(400).json({ error: "League name and user ID are required" });

    // Generate a unique league code
    const inviteCode = generateLeagueCode();

    // Create the league in Firestore
    const leagueRef = await db.collection("leagues").add({
      leagueName,
      inviteCode,
      createdAt: new Date(),
      createdBy: userId,
      members: [userId] // Add creator as first member
    });

    res.json({
      message: `Welcome ${userId}! League created successfully - share the Invite Code (${inviteCode}) with others to join your league`,
      leagueId: leagueRef.id,
      inviteCode
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create league" });
  }
});

// Test route for /create-league get from collection 'leagues'
app.get("/create-league", async (req, res) => {
  try {
    const snapshot = await db.collection("leagues").get();
    res.send(`Firebase connected! Found ${snapshot.size} documents. In /create-league route`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Firebase connection failed");
  }
});


// JOIN LEAGUE endpoint
//Post URL - http://localhost:5001/join-league
/*
  {
    "InviteCode": "abc123",
    "userId": "john"
  }
*/

/*Enhancements
  Make league joinable by Code or leagueName - done

*/

app.post("/join-league", async (req, res) => {
  try {
    //const { leagueId, userId} = req.body; //join via leagueid
    const { inviteCode, userId } = req.body; //join via invite code

    // if (!leagueId || !userId) {
    //   return res.status(400).json({ error: "leagueId and userId are required" });
    // }

    if (!inviteCode || !userId){
      return res.status(400).json({ error: "Invite Code and Username are required" });
    }

    // const leagueRef = db.collection("leagues").doc(leagueId);
    // const leagueSnap = await leagueRef.get();

    // if (!leagueSnap.exists) {
    //   return res.status(404).json({ error: "League not found" });
    // }

    //Query the DB for Invite Code
    const leagueQuery = await db
    .collection("leagues")
    .where("inviteCode", "==", inviteCode)
    .get();


    //Check if League is found via invite code
    if (leagueQuery.empty) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    // Get first matching league
    const leagueDoc = leagueQuery.docs[0]; //Pulls league from DB

    const leagueRef = leagueDoc.ref;

    const leagueData = leagueDoc.data();

    //Check if user is already a member
    const members = leagueData.members || [];
    if (members.includes(userId)) { 
      return res.status(400).json({ error: "User is already a member of this league" });
    }

    // Add user to league members
    await leagueRef.update({
      members: admin.firestore.FieldValue.arrayUnion(userId)
    });

    const leagueName = leagueData.leagueName; 
    

    res.json({ 
      message: `Welcome to League: ${leagueName}`, 
      userId,
      leagueName      
     });
  } catch (error) {
    console.error("Join league error:", error);
    res.status(500).json({ error: "Failed to join league" });
  }
});

//ADD MATCH endpoint
//Post URL - http://localhost:5001/add-match
/*
  {
    "teamA": "Mexico",
    "teamB": "South Africa",
    "kickoffTime": "14:00pm",
    "stage" : "group-stage", //needs to match name from stages collection in Firestore
    "round" : "Round 1"
  }
*/
app.post("/add-match", async (req, res) => {
  try {
    const { teamA, teamB, kickoffTime, stage, round, group} = req.body;

    if (!teamA || !teamB || !kickoffTime || !stage || !round || !group) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Create a new document in Firestore
    const matchRef = await db.collection("matches").add({
      teamA,
      teamB,
      kickoffTime,
      stage,
      round,
      group,
      result: null,
      winner: null,
      status: "TIMED",
      homeGoals: null,
      awayGoals: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: "Match added!", matchId: matchRef.id });

  } catch (error) {
    console.error("Add match error:", error);
    res.status(500).json({ error: "Failed to add match" });
  }
});

//Get All Matches from Firestore 
app.get("/matches", async (req, res) => {
  try {
    const snapshot = await db.collection("matches").get();
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(matches);

  } catch (error) {
    console.error("Get matches error:", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

//Submit Picks Endpoint
app.post("/submit-picks", async (req, res) => {
  try {
    //if (!requireAdmin(req, res)) return;

    const {
      leagueId,
      userId,
      stage,
      picks,
      tiebreakerGoals
    } = req.body;

    // Validate required fields
    if (!leagueId || !userId || !stage || !picks) {
      return res.status(400).json({
        error: "leagueId, userId, stage, and picks are required"
      });
    }

    // Get stage document
    const stageRef = db.collection("stages").doc(stage);

    const stageSnap = await stageRef.get();

    // Check if stage exists
    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    // Get stage data
    const stageData = stageSnap.data();

    // Check if stage is manually locked
    if (stageData.isLocked) {
      return res.status(400).json({
        error: "This stage is locked"
      });
    }

    // Check lock time
    const now = new Date();

    const lockTime = stageData.lockTime.toDate();

    //If locktime has already passed - pick submission should be locked
    if (now >= lockTime) {
      return res.status(400).json({
        error: "Pick submissions are closed for this stage"
      });
    }

    // Reference league
    const leagueRef = db.collection("leagues").doc(leagueId);

    const leagueSnap = await leagueRef.get();

    // Check if league exists
    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    const leagueData = leagueSnap.data();

    // Check membership
    if (!leagueData.members.includes(userId)) {
      return res.status(400).json({
        error: "User is not a member of this league"
      });
    }

    // Save picks
    await db
      .collection("picks")
      .doc(leagueId)
      .collection(stage)
      .doc(userId)
      .set({
        picks,
        tiebreakerGoals,
        submittedAt: new Date()
      });

    // Success response
    res.json({
      message: "Picks submitted successfully! Good luck..."
    });

  } catch (error) {

    console.error("Submit picks error:", error);

    res.status(500).json({
      error: "Failed to submit picks"
    });
  }
});

//Stages pull
app.get("/stage/:stageId", async (req, res) => {
  try {

    // Get stageId from URL
    const { stageId } = req.params;

    // Reference Firestore document
    const stageRef = db.collection("stages").doc(stageId);

    // Fetch document
    const stageSnap = await stageRef.get();

    // Check if stage exists
    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    // Get stage data
    const stageData = stageSnap.data();

    // Return response
    res.json(stageData);

  } catch (error) {

    console.error("Stage fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch stage"
    });
  }
});

//Get Matches by Stage
app.get("/matches/:stage", async (req, res) => {
  try {

    const { stage } = req.params;

    if (!stage) {
      return res.status(400).json({
        error: "Stage parameter is required"
      });
    }

    const matchesSnapshot = await db
      .collection("matches")
      .where("stage", "==", stage)
      .get();

    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      matchID: doc.matchID,
      ...doc.data()
    }));

    res.json(matches);

  } catch (error) {

    console.error("Get matches error:", error);

    res.status(500).json({
      error: "Failed to fetch matches"
    });
  }

});


//GET USERS league memberships
app.get("/user-leagues/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: "User ID parameter is required"
      });
    }
    
    
    const leaguesSnapshot = await db
      .collection("leagues")
      .where("members", "array-contains", userId)
      .get();

    //Return all leagues where user is a member - pull from DB
    // const leagues = leaguesSnapshot.docs.map(doc => ({
    //   id: doc.id,
    //   ...doc.data()
    // }));

    //Santized only return some league info to user 
    const leagues = leaguesSnapshot.docs.map(doc => {
    const data = doc.data();

    //Return only league name and invite code to user - no need to return members or createdAt
    return {
      id: doc.id,
      leagueName: data.leagueName,
      inviteCode: data.inviteCode
    };
  });
    //Return leagues data
    res.json(leagues);

  } catch (error) {

    console.error("Get user leagues error:", error);

    res.status(500).json({
      error: "Failed to fetch user leagues"
    });
  }
});


//GET USER PICKS for stage and league
app.get("/picks/:leagueId/:stage/:userId", async (req, res) => {
  try {

    const { leagueId, stage, userId } = req.params;

    //Navigate to picks collection for league, stage, and user this should be the write path from submit picks endpoint
    const pickRef = db
      .collection("picks")
      .doc(leagueId)
      .collection(stage)
      .doc(userId);

    //Fetch picks from Firestore
    const pickSnap = await pickRef.get();

    if (!pickSnap.exists) {
      return res.status(404).json({
        error: "Picks not found"
      });
    }

    //Return picks data to user
    res.json({
      id: pickSnap.id,
      ...pickSnap.data()
    });

  } catch (error) {

    console.error("Get picks error:", error);

    res.status(500).json({
      error: "Failed to fetch picks"
    });
  }

});


//POST UPDATE MATCH RESULT
app.post("/update-match-result", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const {
      matchId,
      winner,
      status,
      homeGoals,
      awayGoals
    } = req.body;

    // Validate fields
    if (!matchId || !status) {
      return res.status(400).json({
        error: "matchId and status are required"
      });
    }

    // Reference match
    const matchRef = db.collection("matches").doc(matchId);

    const matchSnap = await matchRef.get();

    // Check match exists
    if (!matchSnap.exists) {
      return res.status(404).json({
        error: "Match not found"
      });
    }

    // Update match
    await matchRef.update({
      winner,
      status,
      homeGoals,
      awayGoals,
      updatedAt: new Date()
    });

    // Success response
    res.json({
      message: "Match updated successfully"
    });

  } catch (error) {

    console.error("Update match error:", error);

    res.status(500).json({
      error: "Failed to update match"
    });
  }
});

//POST CALCULATE STAGE SCORES
app.post("/calculate-stage-scores", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { leagueId, stage } = req.body;

    if (!leagueId || !stage) {
      return res.status(400).json({
        error: "leagueId and stage are required"
      });
    }

    // Get stage document
    const stageRef = db.collection("stages").doc(stage);
    const stageSnap = await stageRef.get();

    // Check stage exists
    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    const stageData = stageSnap.data();

    // Prevent recalculation if finalized
    if (stageData.isFinalized) {
      return res.status(400).json({
        error: "Stage has already been finalized"
      });
    }


    // 1. Verify league exists
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    // 2. Get all finished matches for this stage
    const matchesSnapshot = await db
      .collection("matches")
      .where("stage", "==", stage)
      .where("status", "==", "FINISHED")
      .get();

    if (matchesSnapshot.empty) {
      return res.status(400).json({
        error: "No finished matches found for this stage"
      });
    }

    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${matches.length} finished matches for stage ${stage}`);


    // 3. Create a lookup map by matchId
    const matchMap = {};

    let actualTotalGoals = 0;

    matches.forEach(match => {
      matchMap[match.id] = match;

      const homeGoals = match.homeGoals || 0;
      const awayGoals = match.awayGoals || 0;

      actualTotalGoals += homeGoals + awayGoals;
    });


    // 4. Get all submitted picks for this league + stage
    const picksSnapshot = await db
      .collection("picks")
      .doc(leagueId)
      .collection(stage)
      .get();

    if (picksSnapshot.empty) {
      return res.status(400).json({
        error: "No picks found for this league and stage"
      });
    }

    // 5. Calculate base scores
    const scores = [];

    picksSnapshot.docs.forEach(doc => {
      const userId = doc.id;
      const pickData = doc.data();

      let points = 0;

      const userPicks = pickData.picks || [];

      userPicks.forEach(userPick => {
        const match = matchMap[userPick.matchId];

        // If match doesn't exist or hasn't finished, skip it
        if (!match) return;

        if (userPick.pick === match.winner) {
          points += 1;
        }
      });

      const predictedGoals = Number(pickData.tiebreakerGoals);
      const tiebreakerDifference = Math.abs(actualTotalGoals - predictedGoals);

      scores.push({
        userId,
        points,
        tiebreakerGoals: predictedGoals,
        tiebreakerDifference
      });
    });

    // 6. Find closest tiebreaker prediction
    const closestDifference = Math.min(
      ...scores.map(score => score.tiebreakerDifference)
    );

    // 7. Award +5 to all users tied for closest tiebreaker
    const finalScores = scores.map(score => {
      const tiebreakerPoints =
        score.tiebreakerDifference === closestDifference ? 5 : 0;

      return {
        ...score,
        matchPoints: score.points,
        tiebreakerPoints,
        totalPoints: score.points + tiebreakerPoints,
        actualTotalGoals,
        calculatedAt: new Date()
      };
    });

    // 8. Save scores to Firestore
    const batch = db.batch();

    finalScores.forEach(score => {
      const scoreRef = db
        .collection("scores")
        .doc(leagueId)
        .collection(stage)
        .doc(score.userId);

      batch.set(scoreRef, score);
    });

    await batch.commit();

    // 9. Return results
    res.json({
      message: "Stage scores calculated successfully",
      leagueId,
      stage,
      actualTotalGoals,
      scores: finalScores
    });

  } catch (error) {
    console.error("Calculate scores error:", error);

    res.status(500).json({
      error: "Failed to calculate stage scores"
    });
  }
});

//GET /leaderboard/:leagueId/:stage - returns sorted leaderboard for a league and stage based on calculated scores
app.get("/leaderboard/:leagueId/:stage", async (req, res) => {
  try {
    const { leagueId, stage } = req.params;

    if (!leagueId || !stage) {
      return res.status(400).json({
        error: "leagueId and stage are required"
      });
    }

    const scoresSnapshot = await db
      .collection("scores")
      .doc(leagueId)
      .collection(stage)
      .get();

    if (scoresSnapshot.empty) {
      return res.status(404).json({
        error: "No scores found for this league and stage. Run /calculate-stage-scores first."
      });
    }

    const leaderboard = scoresSnapshot.docs
      .map(doc => {
        const data = doc.data();

        return {
          userId: doc.id,
          matchPoints: data.matchPoints || 0,
          tiebreakerPoints: data.tiebreakerPoints || 0,
          totalPoints: data.totalPoints || 0,
          tiebreakerGoals: data.tiebreakerGoals,
          tiebreakerDifference: data.tiebreakerDifference
        };
      })
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }

        return a.tiebreakerDifference - b.tiebreakerDifference;
      })
      .map((user, index) => ({
        rank: index + 1,
        ...user
      }));

    res.json({
      leagueId,
      stage,
      leaderboard
    });

  } catch (error) {
    console.error("Leaderboard error:", error);

    res.status(500).json({
      error: "Failed to get leaderboard"
    });
  }
});


//Get all leagues endpoint
app.get("/leagues", async (req, res) => {
  try {
    const snapshot = await db.collection("leagues").get();
    const leagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(leagues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});

//GET specific league details by leagueId - including members and invite code
app.get("/league/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;

    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    const leagueData = leagueSnap.data();

    res.json({
      id: leagueSnap.id,
      leagueName: leagueData.leagueName,
      inviteCode: leagueData.inviteCode,
      members: leagueData.members || []
    });

  } catch (error) {
    console.error("League fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch league"
    });
  }
});

//Get stage lock status
app.get("/stage-status/:stage", async (req, res) => {
  try {
    const { stage } = req.params;

    if (!stage) {
      return res.status(400).json({
        error: "Stage parameter is required"
      });
    }

    const stageRef = db.collection("stages").doc(stage);
    const stageSnap = await stageRef.get();

    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    const stageData = stageSnap.data();

    if (!stageData.lockTime) {
      return res.status(400).json({
        error: "Stage lockTime is missing"
      });
    }

    const now = new Date();
    const lockTime = stageData.lockTime.toDate();

    const isManuallyLocked = stageData.isLocked === true;
    const isTimeClosed = now >= lockTime;

    let status = "open";

    if (isManuallyLocked) {
      status = "locked";
    } else if (isTimeClosed) {
      status = "closed";
    }

    res.json({
      stage,
      status,
      isLocked: isManuallyLocked,
      isClosed: isTimeClosed,
      lockTime,
      serverTime: now
    });

  } catch (error) {
    console.error("Stage status error:", error);

    res.status(500).json({
      error: "Failed to fetch stage status"
    });
  }
});

// POST FINALIZE STAGE
app.post("/finalize-stage", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { leagueId, stage } = req.body;

    if (!leagueId || !stage) {
      return res.status(400).json({
        error: "leagueId and stage are required"
      });
    }

    // 1. Verify league exists
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    // 2. Verify stage exists
    const stageRef = db.collection("stages").doc(stage);
    const stageSnap = await stageRef.get();

    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    const stageData = stageSnap.data();

    // 3. Prevent duplicate finalization
    if (stageData.isFinalized) {
      return res.status(400).json({
        error: "Stage has already been finalized"
      });
    }

    // 4. Confirm scores were calculated first
    const scoresSnapshot = await db
      .collection("scores")
      .doc(leagueId)
      .collection(stage)
      .get();

    if (scoresSnapshot.empty) {
      return res.status(400).json({
        error: "No scores found. Run /calculate-stage-scores first."
      });
    }

    // 5. Mark stage as finalized
    await stageRef.update({
      isFinalized: true,
      finalizedAt: new Date(),
      finalizedForLeagueId: leagueId
    });

    res.json({
      message: "Stage finalized successfully",
      leagueId,
      stage,
      finalized: true
    });

  } catch (error) {
    console.error("Finalize stage error:", error);

    res.status(500).json({
      error: "Failed to finalize stage"
    });
  }
});

// GET USER RESULTS FOR STAGE
app.get("/results/:leagueId/:stage/:userId", async (req, res) => {
  try {
    const { leagueId, stage, userId } = req.params;

    if (!leagueId || !stage || !userId) {
      return res.status(400).json({
        error: "leagueId, stage, and userId are required"
      });
    }

    // 1. Get user's submitted picks
    const pickRef = db
      .collection("picks")
      .doc(leagueId)
      .collection(stage)
      .doc(userId);

    const pickSnap = await pickRef.get();

    if (!pickSnap.exists) {
      return res.status(404).json({
        error: "Picks not found for this user"
      });
    }

    const pickData = pickSnap.data();
    const userPicks = pickData.picks || [];

    // 2. Get finished matches for this stage
    const matchesSnapshot = await db
      .collection("matches")
      .where("stage", "==", stage)
      .where("status", "==", "FINISHED")
      .get();

    if (matchesSnapshot.empty) {
      return res.status(404).json({
        error: "No finished matches found for this stage"
      });
    }

    // 3. Create match lookup by match ID
    const matchMap = {};

    matchesSnapshot.docs.forEach(doc => {
      matchMap[doc.id] = {
        id: doc.id,
        ...doc.data()
      };
    });

    // 4. Compare each user pick against the real result
    const results = userPicks.map(userPick => {
      const match = matchMap[userPick.matchId];

      if (!match) {
        return {
          matchId: userPick.matchId,
          userPick: userPick.pick,
          actualWinner: null,
          correct: false,
          pointsEarned: 0,
          status: "Match not finished or not found"
        };
      }

      const correct = userPick.pick === match.winner;

      return {
        matchId: userPick.matchId,
        teamA: match.teamA,
        teamB: match.teamB,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        userPick: userPick.pick,
        actualWinner: match.winner,
        correct,
        pointsEarned: correct ? 1 : 0,
        status: match.status
      };
    });

    // 5. Get saved score if calculation has already run
    const scoreRef = db
      .collection("scores")
      .doc(leagueId)
      .collection(stage)
      .doc(userId);

    const scoreSnap = await scoreRef.get();

    const scoreData = scoreSnap.exists ? scoreSnap.data() : null;

    // 6. Return response
    res.json({
      leagueId,
      stage,
      userId,
      tiebreakerGoals: pickData.tiebreakerGoals,
      results,
      score: scoreData
        ? {
            matchPoints: scoreData.matchPoints,
            tiebreakerPoints: scoreData.tiebreakerPoints,
            totalPoints: scoreData.totalPoints,
            actualTotalGoals: scoreData.actualTotalGoals,
            tiebreakerDifference: scoreData.tiebreakerDifference
          }
        : {
            message: "Score has not been calculated yet"
          }
    });

  } catch (error) {
    console.error("Get results error:", error);

    res.status(500).json({
      error: "Failed to fetch results"
    });
  }
});

// GET LEAGUE SUMMARY
app.get("/league-summary/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;

    if (!leagueId) {
      return res.status(400).json({
        error: "leagueId is required"
      });
    }

    // 1. Get league
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    const leagueData = leagueSnap.data();

    // 2. Set current stage
    let currentStage = "group-stage"; // Default stage
    const settingsRef = db.collection("settings").doc("app");
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      return res.status(404).json({
        error: "App settings not found"
      });
    }

    if (settingsSnap.exists) {
      const settingsData = settingsSnap.data();
      if (settingsData.currentStage) {
        currentStage = settingsData.currentStage;
      }
    }

    // 3. Get stage info
    const stageRef = db.collection("stages").doc(currentStage);
    const stageSnap = await stageRef.get();

    let stageStatus = "unknown";
    let lockTime = null;

    if (stageSnap.exists) {
      const stageData = stageSnap.data();

      if (stageData.lockTime) {
        const now = new Date();
        const stageLockTime = stageData.lockTime.toDate();

        const isManuallyLocked = stageData.isLocked === true;
        const isTimeClosed = now >= stageLockTime;

        if (isManuallyLocked) {
          stageStatus = "locked";
        } else if (isTimeClosed) {
          stageStatus = "closed";
        } else {
          stageStatus = "open";
        }

        lockTime = stageLockTime;
      }
    }

    // 4. Get leaderboard preview
    const scoresSnapshot = await db
      .collection("scores")
      .doc(leagueId)
      .collection(currentStage)
      .get();

    let topPlayers = [];

    if (!scoresSnapshot.empty) {
      topPlayers = scoresSnapshot.docs
        .map(doc => {
          const data = doc.data();

          return {
            userId: doc.id,
            totalPoints: data.totalPoints || 0,
            matchPoints: data.matchPoints || 0,
            tiebreakerPoints: data.tiebreakerPoints || 0
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 5);
    }

    // 5. Get upcoming matches
    const matchesSnapshot = await db
      .collection("matches")
      .where("stage", "==", currentStage)
      .where("status", "==", "scheduled")
      .get();

    const upcomingMatches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 6. Return summary
    res.json({
      leagueId,
      leagueName: leagueData.leagueName,
      inviteCode: leagueData.inviteCode,
      memberCount: leagueData.members ? leagueData.members.length : 0,
      members: leagueData.members || [],
      currentStage,
      stageStatus,
      lockTime,
      topPlayers,
      upcomingMatches
    });

  } catch (error) {
    console.error("League summary error:", error);

    res.status(500).json({
      error: "Failed to fetch league summary"
    });
  }
});

// GET CURRENT STAGE
app.get("/current-stage", async (req, res) => {
  try {
    const settingsRef = db.collection("settings").doc("app");
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      return res.status(404).json({
        error: "App settings not found"
      });
    }

    const settingsData = settingsSnap.data();
    const currentStage = settingsData.currentStage;

    if (!currentStage) {
      return res.status(400).json({
        error: "currentStage is not set"
      });
    }

    const stageRef = db.collection("stages").doc(currentStage);
    const stageSnap = await stageRef.get();

    const stageData = stageSnap.exists ? stageSnap.data() : {};

    res.json({
      currentStage,
      currentStageDisplay: stageData.displayName || currentStage,
      isLocked: stageData.isLocked ?? false,
      isFinalized: stageData.isFinalized ?? false,
      lockTime: stageData.lockTime || null
    });

  } catch (error) {
    console.error("Current stage error:", error);

    res.status(500).json({
      error: "Failed to fetch current stage"
    });
  }
});

// POST SET CURRENT STAGE
app.post("/set-current-stage", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({
        error: "stage is required"
      });
    }

    // 1. Verify the stage exists
    const stageRef = db.collection("stages").doc(stage);
    const stageSnap = await stageRef.get();

    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    // 2. Update app settings
    const settingsRef = db.collection("settings").doc("app");

    await settingsRef.set(
      {
        currentStage: stage,
        updatedAt: new Date()
      },
      { merge: true }
    );

    res.json({
      message: "Current stage updated successfully",
      currentStage: stage
    });

  } catch (error) {
    console.error("Set current stage error:", error);

    res.status(500).json({
      error: "Failed to set current stage"
    });
  }
});


// API CALLS TO FOOTBALL-DATA.ORG
// POST SYNC 2026 WORLD CUP MATCHES - Pulling from football-data.org API and saving to Firestore
app.post("/sync-worldcup-matches", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "FOOTBALL_DATA_API_KEY is missing from .env"
      });
    }

    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      {
        headers: {
          "X-Auth-Token": apiKey
        }
      }
    );

    const matches = response.data.matches || [];

    if (matches.length === 0) {
      return res.status(404).json({
        error: "No World Cup 2026 matches found from API"
      });
    }

    const batch = db.batch();

    matches.forEach(match => {
      const matchRef = db
        .collection("matches")
        .doc(match.id.toString());

      const homeGoals = match.score?.fullTime?.home ?? null;
      const awayGoals = match.score?.fullTime?.away ?? null;

      let winner = null;

      if (match.score?.winner === "HOME_TEAM") {
        winner = match.homeTeam?.name;
      } else if (match.score?.winner === "AWAY_TEAM") {
        winner = match.awayTeam?.name;
      } else if (match.score?.winner === "DRAW") {
        winner = "DRAW";
      }

      batch.set(
        matchRef,
        {
          externalMatchId: match.id,
          teamA: match.homeTeam?.name || "TBD",
          teamB: match.awayTeam?.name || "TBD",
          homeTeamId: match.homeTeam?.id || null,
          awayTeamId: match.awayTeam?.id || null,
          kickoffTime: match.utcDate || null,
          stage: mapStage(match.stage),
          apiStage: match.stage,
          group: match.group || null,
          round: match.matchday || null,
          status: match.status,
          homeGoals,
          awayGoals,
          winner,
          source: "football-data.org",
          updatedAt: new Date()
        },
        { merge: true }
      );
    });

    await batch.commit();

    res.json({
      message: "World Cup 2026 matches synced successfully",
      syncedMatches: matches.length
    });

  } catch (error) {
    console.error("Sync World Cup matches error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to sync World Cup matches",
      details: error.response?.data || error.message
    });
  }
});


// POST SYNC 2026 WORLD CUP RESULTS
app.post("/sync-worldcup-results", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "FOOTBALL_DATA_API_KEY is missing from .env"
      });
    }

    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      {
        headers: {
          "X-Auth-Token": apiKey
        }
      }
    );

    const matches = response.data.matches || [];

    const scheduledStatuses = [
      "SCHEDULED",
      "TIMED",
      "POSTPONED"
    ];

    const scheduledMatches = matches.filter(match =>
      scheduledStatuses.includes(match.status)
    );

    console.log(`Total matches from API: ${matches.length}`);
    console.log(`Scheduled matches (not finished): ${scheduledMatches.length}`);

    const finishedMatches = matches.filter(match =>
      match.status === "FINISHED" ||
      match.status === "AWARDED"
    );

    if (finishedMatches.length === 0) {
      return res.json({
        message: "No finished World Cup matches found yet",
        updatedMatches: 0
      });
    }

    const batch = db.batch();

    finishedMatches.forEach(match => {
      const matchRef = db
        .collection("matches")
        .doc(match.id.toString());

      const homeGoals = match.score?.fullTime?.home ?? null;
      const awayGoals = match.score?.fullTime?.away ?? null;

      let winner = null;

      if (match.score?.winner === "HOME_TEAM") {
        winner = match.homeTeam?.name;
      } else if (match.score?.winner === "AWAY_TEAM") {
        winner = match.awayTeam?.name;
      } else if (match.score?.winner === "DRAW") {
        winner = "DRAW";
      }

      batch.set(
        matchRef,
        {
          status: match.status,
          homeGoals,
          awayGoals,
          winner,
          result: {
            homeGoals,
            awayGoals,
            winner
          },
          lastResultSyncAt: new Date(),
          updatedAt: new Date()
        },
        { merge: true }
      );
    });

    await batch.commit();

    res.json({
      message: "World Cup 2026 results synced successfully",
      updatedMatches: finishedMatches.length
    });

  } catch (error) {
    console.error(
      "Sync World Cup results error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Failed to sync World Cup results",
      details: error.response?.data || error.message
    });
  }
});


//http://localhost:5001/sync-worldcup
// POST SYNC FULL 2026 WORLD CUP DATA Pulls Matches and Results in one call - can be used for initial full sync or future updatess
app.post("/sync-worldcup", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "FOOTBALL_DATA_API_KEY is missing from .env"
      });
    }

    // 1. Fetch matches from football-data.org
    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      {
        headers: {
          "X-Auth-Token": apiKey
        }
      }
    );

    const matches = response.data.matches || [];

    if (matches.length === 0) {
      return res.status(404).json({
        error: "No World Cup 2026 matches found from API"
      });
    }

    // 2. Debug counts
    const finishedStatuses = ["FINISHED", "AWARDED"];
    const scheduledStatuses = ["SCHEDULED", "TIMED", "POSTPONED"];

    const finishedMatches = matches.filter(match =>
      finishedStatuses.includes(match.status)
    );

    const scheduledMatches = matches.filter(match =>
      scheduledStatuses.includes(match.status)
    );

    const stageCounts = {};

    matches.forEach(match => {
      const stage = match.stage || "UNKNOWN";
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    console.log(`Total matches from API: ${matches.length}`);
    console.log(`Finished matches: ${finishedMatches.length}`);
    console.log(`Scheduled matches: ${scheduledMatches.length}`);
    console.log("Stage Breakdown:", stageCounts);

    // 3. Save/update every match in Firestore
    const batch = db.batch();

    matches.forEach(match => {
      const matchRef = db
        .collection("matches")
        .doc(match.id.toString());

      const homeGoals = match.score?.fullTime?.home ?? null;
      const awayGoals = match.score?.fullTime?.away ?? null;

      let winner = null;

      if (match.score?.winner === "HOME_TEAM") {
        winner = match.homeTeam?.name;
      } else if (match.score?.winner === "AWAY_TEAM") {
        winner = match.awayTeam?.name;
      } else if (match.score?.winner === "DRAW") {
        winner = "DRAW";
      }

      batch.set(
        matchRef,
        {
          externalMatchId: match.id,
          teamA: match.homeTeam?.name || "TBD",
          teamB: match.awayTeam?.name || "TBD",
          homeTeamId: match.homeTeam?.id || null,
          awayTeamId: match.awayTeam?.id || null,
          kickoffTime: match.utcDate || null,

          // App-friendly stage
          stage: mapStage(match.stage),

          // Raw API stage for debugging
          apiStage: match.stage || null,

          group: match.group || null,
          round: match.matchday || null,
          status: match.status,

          homeGoals,
          awayGoals,
          winner,

          result: {
            homeGoals,
            awayGoals,
            winner
          },

          source: "football-data.org",
          lastFullSyncAt: new Date(),
          updatedAt: new Date()
        },
        { merge: true }
      );
    });

    await batch.commit();

    // 4. Return summary
    res.json({
      message: "World Cup 2026 data synced successfully",
      totalMatches: matches.length,
      finishedMatches: finishedMatches.length,
      scheduledMatches: scheduledMatches.length,
      stageCounts
    });

  } catch (error) {
    console.error(
      "Sync World Cup error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Failed to sync World Cup data",
      details: error.response?.data || error.message
    });
  }
});


// POST PROCESS STAGE - Pulls latest match data from football-data.org, updates Firestore, then calculates scores for a specific league and stage - can be used to process each stage as it finishes
app.post("/process-stage", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { leagueId, stage } = req.body;

    if (!leagueId || !stage) {
      return res.status(400).json({
        error: "leagueId and stage are required"
      });
    }

    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "FOOTBALL_DATA_API_KEY is missing from .env"
      });
    }

    // 1. Check stage exists
    const stageRef = db.collection("stages").doc(stage);
    const stageSnap = await stageRef.get();

    if (!stageSnap.exists) {
      return res.status(404).json({
        error: "Stage not found"
      });
    }

    const stageData = stageSnap.data();

    if (stageData.isFinalized) {
      return res.status(400).json({
        error: "Stage has already been finalized"
      });
    }

    // 2. Check league exists
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    // 3. Sync latest World Cup data
    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      {
        headers: {
          "X-Auth-Token": apiKey
        }
      }
    );

    const apiMatches = response.data.matches || [];

    if (apiMatches.length === 0) {
      return res.status(404).json({
        error: "No World Cup 2026 matches found from API"
      });
    }

    const syncBatch = db.batch();

    apiMatches.forEach(match => {
      const matchRef = db
        .collection("matches")
        .doc(match.id.toString());

      const homeGoals = match.score?.fullTime?.home ?? null;
      const awayGoals = match.score?.fullTime?.away ?? null;

      let winner = null;

      if (match.score?.winner === "HOME_TEAM") {
        winner = match.homeTeam?.name;
      } else if (match.score?.winner === "AWAY_TEAM") {
        winner = match.awayTeam?.name;
      } else if (match.score?.winner === "DRAW") {
        winner = "DRAW";
      }

      syncBatch.set(
        matchRef,
        {
          externalMatchId: match.id,
          teamA: match.homeTeam?.name || "TBD",
          teamB: match.awayTeam?.name || "TBD",
          homeTeamId: match.homeTeam?.id || null,
          awayTeamId: match.awayTeam?.id || null,
          kickoffTime: match.utcDate || null,
          stage: mapStage(match.stage),
          apiStage: match.stage || null,
          group: match.group || null,
          round: match.matchday || null,
          status: match.status,
          homeGoals,
          awayGoals,
          winner,
          result: {
            homeGoals,
            awayGoals,
            winner
          },
          source: "football-data.org",
          lastProcessSyncAt: new Date(),
          updatedAt: new Date()
        },
        { merge: true }
      );
    });

    await syncBatch.commit();

    // 4. Get finished matches for requested stage only
    const matchesSnapshot = await db
      .collection("matches")
      .where("stage", "==", stage)
      .where("status", "==", "FINISHED")
      .get();

    if (matchesSnapshot.empty) {
      return res.json({
        message: "World Cup data synced, but no finished matches found for this stage yet",
        leagueId,
        stage,
        syncedMatches: apiMatches.length,
        finishedMatchesForStage: 0,
        scoresUpdated: false,
        finalized: false
      });
    }

    const finishedMatches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const matchMap = {};
    let actualTotalGoals = 0;

    finishedMatches.forEach(match => {
      matchMap[match.id] = match;

      const homeGoals = match.homeGoals || 0;
      const awayGoals = match.awayGoals || 0;

      actualTotalGoals += homeGoals + awayGoals;
    });

    // 5. Get submitted picks
    const picksSnapshot = await db
      .collection("picks")
      .doc(leagueId)
      .collection(stage)
      .get();

    if (picksSnapshot.empty) {
      return res.json({
        message: "World Cup data synced, but no picks found for this league and stage",
        leagueId,
        stage,
        syncedMatches: apiMatches.length,
        finishedMatchesForStage: finishedMatches.length,
        scoresUpdated: false,
        finalized: false
      });
    }

    // 6. Calculate scores
    const scores = [];

    picksSnapshot.docs.forEach(doc => {
      const userId = doc.id;
      const pickData = doc.data();

      let points = 0;
      const userPicks = pickData.picks || [];

      userPicks.forEach(userPick => {
        const match = matchMap[userPick.matchId];

        if (!match) return;

        if (userPick.pick === match.winner) {
          points += 1;
        }
      });

      const predictedGoals = Number(pickData.tiebreakerGoals);
      const tiebreakerDifference = Math.abs(actualTotalGoals - predictedGoals);

      scores.push({
        userId,
        points,
        tiebreakerGoals: predictedGoals,
        tiebreakerDifference
      });
    });

    // 7. Tiebreaker points based on currently finished matches
    const closestDifference = Math.min(
      ...scores.map(score => score.tiebreakerDifference)
    );

    const finalScores = scores.map(score => {
      const tiebreakerPoints =
        score.tiebreakerDifference === closestDifference ? 5 : 0;

      return {
        ...score,
        matchPoints: score.points,
        tiebreakerPoints,
        totalPoints: score.points + tiebreakerPoints,
        actualTotalGoals,
        finishedMatchesCount: finishedMatches.length,
        calculatedAt: new Date()
      };
    });

    // 8. Save scores
    const scoreBatch = db.batch();

    finalScores.forEach(score => {
      const scoreRef = db
        .collection("scores")
        .doc(leagueId)
        .collection(stage)
        .doc(score.userId);

      scoreBatch.set(scoreRef, score);
    });

    await scoreBatch.commit();

    // 9. Build leaderboard
    const leaderboard = finalScores
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }

        return a.tiebreakerDifference - b.tiebreakerDifference;
      })
      .map((score, index) => ({
        rank: index + 1,
        userId: score.userId,
        matchPoints: score.matchPoints,
        tiebreakerPoints: score.tiebreakerPoints,
        totalPoints: score.totalPoints,
        tiebreakerDifference: score.tiebreakerDifference
      }));

    res.json({
      message: "Stage processed successfully",
      leagueId,
      stage,
      syncedMatches: apiMatches.length,
      finishedMatchesForStage: finishedMatches.length,
      actualTotalGoals,
      scoresUpdated: true,
      finalized: false,
      leaderboard
    });

  } catch (error) {
    console.error("Process stage error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to process stage",
      details: error.response?.data || error.message
    });
  }
});


//FRONT END APIs 
// GET DASHBOARD
app.get("/dashboard/:leagueId/:userId", async (req, res) => {
  try {
    const { leagueId, userId } = req.params;

    if (!leagueId || !userId) {
      return res.status(400).json({
        error: "leagueId and userId are required"
      });
    }

    // 1. Get league
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    const leagueData = leagueSnap.data();

    if (!leagueData.members || !leagueData.members.includes(userId)) {
      return res.status(403).json({
        error: "User is not a member of this league"
      });
    }

    // 2. Get current stage
    const settingsRef = db.collection("settings").doc("app");
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      return res.status(404).json({
        error: "App settings not found"
      });
    }

    const settingsData = settingsSnap.data();
    const currentStage = settingsData.currentStage;

    if (!currentStage) {
      return res.status(400).json({
        error: "currentStage is not set"
      });
    }

    // 3. Get stage status
    const stageRef = db.collection("stages").doc(currentStage);
    const stageSnap = await stageRef.get();

    let stageStatus = "unknown";
    let lockTime = null;
    let isLocked = false;
    let isClosed = false;
    let isFinalized = false;

    if (stageSnap.exists) {
      const stageData = stageSnap.data();

      isLocked = stageData.isLocked === true;
      isFinalized = stageData.isFinalized === true;

      if (stageData.lockTime) {
        const now = new Date();
        lockTime = stageData.lockTime.toDate();
        isClosed = now >= lockTime;

        if (isFinalized) {
          stageStatus = "finalized";
        } else if (isLocked) {
          stageStatus = "locked";
        } else if (isClosed) {
          stageStatus = "closed";
        } else {
          stageStatus = "open";
        }
      }
    }

    // 4. Check if user submitted picks
    const pickRef = db
      .collection("picks")
      .doc(leagueId)
      .collection(currentStage)
      .doc(userId);

    const pickSnap = await pickRef.get();

    const hasSubmittedPicks = pickSnap.exists;
    const pickData = pickSnap.exists ? pickSnap.data() : null;

    // 5. Get leaderboard data
    const scoresSnapshot = await db
      .collection("scores")
      .doc(leagueId)
      .collection(currentStage)
      .get();

    let leaderboard = [];

    if (!scoresSnapshot.empty) {
      leaderboard = scoresSnapshot.docs
        .map(doc => {
          const data = doc.data();

          return {
            userId: doc.id,
            matchPoints: data.matchPoints || 0,
            tiebreakerPoints: data.tiebreakerPoints || 0,
            totalPoints: data.totalPoints || 0,
            tiebreakerDifference: data.tiebreakerDifference ?? null
          };
        })
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }

          return (a.tiebreakerDifference ?? 9999) - (b.tiebreakerDifference ?? 9999);
        })
        .map((player, index) => ({
          rank: index + 1,
          ...player
        }));
    }

    const userStanding = leaderboard.find(player => player.userId === userId) || null;
    const leaderboardPreview = leaderboard.slice(0, 5);

    // 6. Get upcoming matches for current stage
    const upcomingSnapshot = await db
      .collection("matches")
      .where("stage", "==", currentStage)
      .where("status", "in", ["SCHEDULED", "TIMED", "POSTPONED"])
      .get();

    const upcomingMatches = upcomingSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const dateA = new Date(a.kickoffTime);
        const dateB = new Date(b.kickoffTime);
        return dateA - dateB;
      })
      .slice(0, 10);

    // 7. Get recent finished results
    const resultsSnapshot = await db
      .collection("matches")
      .where("stage", "==", currentStage)
      .where("status", "==", "FINISHED")
      .get();

    const recentResults = resultsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const dateA = new Date(a.kickoffTime);
        const dateB = new Date(b.kickoffTime);
        return dateB - dateA;
      })
      .slice(0, 10);

    // 8. Return dashboard response
    res.json({
      league: {
        id: leagueSnap.id,
        leagueName: leagueData.leagueName,
        inviteCode: leagueData.inviteCode,
        memberCount: leagueData.members.length
      },

      currentStage,

      stage: {
        status: stageStatus,
        isLocked,
        isClosed,
        isFinalized,
        lockTime
      },

      user: {
        userId,
        hasSubmittedPicks,
        submittedAt: pickData?.submittedAt || null,
        tiebreakerGoals: pickData?.tiebreakerGoals || null,
        standing: userStanding
      },

      leaderboardPreview,

      upcomingMatches,

      recentResults
    });

  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      error: "Failed to fetch dashboard"
    });
  }
});


// GET SEASON LEADERBOARD
app.get("/season-leaderboard/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;

    if (!leagueId) {
      return res.status(400).json({
        error: "leagueId is required"
      });
    }

    // 1. Verify league exists
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({
        error: "League not found"
      });
    }

    // 2. Define all stages in tournament order
    const stages = [
      "group-stage",
      "round-of-32",
      "round-of-16",
      "quarter-finals",
      "semi-finals",
      "third-place",
      "final"
    ];

    // 3. This will hold totals by user
    const userTotals = {};

    // 4. Loop through each stage and pull scores
    for (const stage of stages) {
      const scoresSnapshot = await db
        .collection("scores")
        .doc(leagueId)
        .collection(stage)
        .get();

      if (scoresSnapshot.empty) {
        continue;
      }

      scoresSnapshot.docs.forEach(doc => {
        const userId = doc.id;
        const data = doc.data();

        if (!userTotals[userId]) {
          userTotals[userId] = {
            userId,
            totalPoints: 0,
            totalMatchPoints: 0,
            totalTiebreakerPoints: 0,
            stagesPlayed: 0,
            stageBreakdown: {}
          };
        }

        const matchPoints = data.matchPoints || 0;
        const tiebreakerPoints = data.tiebreakerPoints || 0;
        const totalPoints = data.totalPoints || 0;

        userTotals[userId].totalPoints += totalPoints;
        userTotals[userId].totalMatchPoints += matchPoints;
        userTotals[userId].totalTiebreakerPoints += tiebreakerPoints;
        userTotals[userId].stagesPlayed += 1;

        userTotals[userId].stageBreakdown[stage] = {
          matchPoints,
          tiebreakerPoints,
          totalPoints
        };
      });
    }

    // 5. Convert object to array and sort
    const leaderboard = Object.values(userTotals)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }

        return b.totalMatchPoints - a.totalMatchPoints;
      })
      .map((user, index) => ({
        rank: index + 1,
        ...user
      }));

    res.json({
      leagueId,
      leaderboard
    });

  } catch (error) {
    console.error("Season leaderboard error:", error);

    res.status(500).json({
      error: "Failed to fetch season leaderboard"
    });
  }
});