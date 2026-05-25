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
    "stage" : "Group Stage"
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
      result: null
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



