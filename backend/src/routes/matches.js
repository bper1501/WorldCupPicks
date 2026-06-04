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