// Load environment variables
require("dotenv").config();

// Third-party libraries
const schedule = require("node-schedule");
const express = require("express");
const { ethers } = require("ethers");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const bodyParser = require("body-parser");
const prisma = require("./lib/prismaClient");
const { scheduleReminders, sendCast } = require("./lib/writingReminder");
const {
  checkAndUpdateAnkys,
  checkAndUpdateMidjourneyOnAFrameAnkys,
  checkAndUpdateGeneratedAnkys,
  closeMintingWindowForAnkys,
  checkAllAnkys,
  theElectronicMadness,
  closeVotingWindowAndOpenMint,
} = require("./lib/ankys");
const { TypedEthereumSigner } = require("arbundles");
const rateLimit = require("express-rate-limit");

// Internal Modules
const { uploadToIrys } = require("./lib/irys");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 100 requests per windowMs
});

// Routes
const blockchainRoutes = require("./routes/blockchain");
const aiRoutes = require("./routes/ai");
const notebooksRoutes = require("./routes/notebooks");
const farcasterRoutes = require("./routes/farcaster");
const farcasterFramesRoutes = require("./routes/farcaster-frames");
const manaRoutes = require("./routes/mana");
const userRoutes = require("./routes/user");
const midjourneyRoutes = require("./routes/midjourney");
const writersRoutes = require("./routes/writers");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.options("*", cors());
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  next();
});

app.use("/blockchain", blockchainRoutes);
app.use("/ai", aiRoutes);
app.use("/notebooks", notebooksRoutes);
app.use("/farcaster", farcasterRoutes);
app.use("/farcaster-frames", farcasterFramesRoutes);
app.use("/midjourney", midjourneyRoutes);
app.use("/mana", manaRoutes);
app.use("/user", userRoutes);
app.use("/writers", writersRoutes);

// scheduleReminders();

schedule.scheduleJob("*/5 * * * *", checkAndUpdateGeneratedAnkys);
schedule.scheduleJob("*/5 * * * *", closeVotingWindowAndOpenMint);
schedule.scheduleJob("*/5 * * * *", closeMintingWindowForAnkys);

// closeVotingWindowAndOpenMint();
// closeMintingWindowForAnkys();
// checkAndUpdateGeneratedAnkys();
// closeVotingWindowAndOpenMint();

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    // Generate a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at indices i and j
    [array[i], array[j]] = [array[j], array[i]];
  }
};

app.get("/ankywriters", async (req, res) => {
  try {
    let ankyWritersResponse = await prisma.ankyWriter.findMany({
      where: {},
    });
    shuffleArray(ankyWritersResponse);
    ankyWritersResponse = ankyWritersResponse.slice(0, 8); // Return only 8 shuffled items
    res.status(200).json({ ankyWriters: ankyWritersResponse });
  } catch (error) {
    console.error("Error fetching AnkyWriters:", error);
    res.status(500).send("Server error");
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to Anky Backend!");
});

app.get("/publicKey", async (req, res) => {
  async function serverInit() {
    const key = process.env.PRIVATE_KEY; // your private key;
    if (!key) throw new Error("Private key is undefined!");
    const signer = new TypedEthereumSigner(key);
    return signer.publicKey;
  }

  const response = await serverInit();
  const pubKey = response.toString("hex");
  return res.status(200).json({ pubKey: pubKey });
});

app.post("/signData", async (req, res) => {
  async function signDataOnServer(signatureData) {
    const key = process.env.PRIVATE_KEY; // your private key
    if (!key) throw new Error("Private key is undefined!");
    const signer = new TypedEthereumSigner(key);
    return Buffer.from(await signer.sign(signatureData));
  }
  const body = JSON.parse(req.body);
  const signatureData = Buffer.from(body.signatureData, "hex");
  const signature = await signDataOnServer(signatureData);
  res.status(200).json({ signature: signature.toString("hex") });
});

function isValidEmail(email) {
  const regex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;
  return regex.test(email);
}

app.post("/add-email", async (req, res) => {
  try {
    const validEmail = isValidEmail(req.body.email);
    if (validEmail) {
      const emailRecord = await prisma.email.create({
        data: {
          email: validEmail,
        },
      });
      return res.status(200).json({ message: "that is a valid email" });
    }
  } catch (error) {
    return res.status(500).json({ message: "that email is invalid" });
  }
});

app.post("/upload-writing", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Invalid text" });
    }

    const cid = await uploadToIrys(text);

    res.status(201).json({ cid });
  } catch (error) {
    console.error("An error occurred while handling your request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
