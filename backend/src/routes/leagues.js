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