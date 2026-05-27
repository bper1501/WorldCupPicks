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