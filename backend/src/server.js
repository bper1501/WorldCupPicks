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
app.post("/create-league", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "League name is required" });

    // Generate a unique league code
    const code = generateLeagueCode();

    // Create the league in Firestore
    const leagueRef = await db.collection("leagues").add({
      name,
      code,
      createdAt: new Date(),
      members: []
    });

    res.json({
      message: "League created successfully",
      leagueId: leagueRef.id,
      code
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
app.post("/join-league", async (req, res) => {
  try {
    const { leagueId, userId } = req.body;

    if (!leagueId || !userId) {
      return res.status(400).json({ error: "leagueId and userId are required" });
    }

    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({ error: "League not found" });
    }

    //Check if user is already a member
    const leagueData = leagueSnap.data();
    const members = leagueData.members || [];
    if (members.includes(userId)) { 
      return res.status(400).json({ error: "User is already a member of this league" });
    }

    // Add user to league members
    await leagueRef.update({
      members: admin.firestore.FieldValue.arrayUnion(userId)
    });

    res.json({ message: "User joined league successfully", userId });
  } catch (error) {
    console.error("Join league error:", error);
    res.status(500).json({ error: "Failed to join league" });
  }
});

//ADD MATCH endpoint
app.post("/add-match", async (req, res) => {
  try {
    const { teamA, teamB, kickoffTime, round } = req.body;

    if (!teamA || !teamB || !kickoffTime || !round) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Create a new document in Firestore
    const matchRef = await db.collection("matches").add({
      teamA,
      teamB,
      kickoffTime: new Date(kickoffTime),
      round,
      result: null
    });

    res.json({ message: "Match added!", matchId: matchRef.id });

  } catch (error) {
    console.error("Add match error:", error);
    res.status(500).json({ error: "Failed to add match" });
  }
});

//Get Matches from Firestore
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

//Submiting Match Picks/Predictions
app.post("/submit-picks", async (req, res) => {
  try {
    const { leagueId, userId, picks } = req.body;

    if (!leagueId || !userId || !picks || picks.length === 0) {
      return res.status(400).json({ error: "leagueId, userId, and picks are required" });
    }

    // Reference the league in Firestore
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
      return res.status(404).json({ error: "League not found" });
    }

    const leagueData = leagueSnap.data();

    if (!leagueData.members.includes(userId)) {
      return res.status(400).json({ error: "User is not a member of this league" });
    }

    // ---------------------------
    // 🔍 Determine round from picks
    // ---------------------------
    // Fetch match info for each pick
    const matchDocs = await Promise.all(
      picks.map(pick => db.collection("matches").doc(pick.matchId).get())
    );

    const rounds = matchDocs.map(doc => doc.data().round);

    // Assume all picks belong to the same round
    const round = rounds[0];

    // ---------------------------
    // 🔒 Lockout logic
    // ---------------------------
    const matchesSnap = await db.collection("matches")
      .where("round", "==", round)
      .get();

    const now = new Date();
    let lockout = false;

    matchesSnap.forEach(doc => {
      const match = doc.data();
      const kickoff = new Date(match.kickoffTime);
      if (now >= kickoff) {
        lockout = true;
      }
    });

    if (lockout) {
      return res.status(400).json({ error: "Cannot submit picks, lockout is active." });
    }

    // Save picks under the userId
    await leagueRef.collection("picks").doc(userId).set({ picks });

    res.json({ message: "Picks submitted successfully!" });

  } catch (error) {
    console.error("Submit picks error:", error);
    res.status(500).json({ error: "Failed to submit picks" });
  }
});




