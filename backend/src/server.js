import express from "express";
import cors from "cors";
import { db } from "./firebase.js";
import admin from "firebase-admin";

const app = express();
app.use(cors());
app.use(express.json());

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

// CREATE LEAGUE endpoint
//http://localhost:5001/create-league
/*
{
  "name" : ""
}
*/

app.post("/create-league", async (req, res) => {
  try {
    const { leagueName } = req.body;
    if (!leagueName) return res.status(400).json({ error: "League name is required" });

    // Generate a unique league code
    const inviteCode = generateLeagueCode();

    // Create the league in Firestore
    const leagueRef = await db.collection("leagues").add({
      leagueName,
      inviteCode,
      createdAt: new Date(),
      members: []
    });

    res.json({
      message: "League created successfully - share the Invite Code with others to join your league",
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
      status: "scheduled",
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