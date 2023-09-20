// Load environment variables
require('dotenv').config();

// Third-party libraries
const express = require('express');
const webPush = require('web-push');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const { TypedEthereumSigner } = require('arbundles');

// Internal modules
const { uploadToBundlr } = require('./lib/bundlrSetup');

// Routes
const blockchainRoutes = require('./routes/blockchain');
const aiRoutes = require('./routes/ai');
const notebooksRoutes = require('./routes/notebooks');

// Constants
const allowedOrigins = [
  'https://anky.lat',
  'https://www.anky.lat',
  'http://localhost:3001',
  'http://localhost:3000',
];

// App initialization
const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Configurations and setups
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};
webPush.setVapidDetails(
  'mailto:jp@anky.lat',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
let subscriptions = []; // Store subscriptions

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      console.log('the origin is: ', origin);
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        console.log('CORS Rejected:', origin);
        return callback(new Error(msg), false);
      }
      console.log('CORS Accepted:', origin);
      return callback(null, true);
    },
  })
);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use('/blockchain', blockchainRoutes);
app.use('/ai', aiRoutes);
app.use('/notebooks', notebooksRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to Anky Backend!');
});

app.get('/publicKey', async (req, res) => {
  async function serverInit() {
    const key = process.env.PRIVATE_KEY; // your private key;
    if (!key) throw new Error('Private key is undefined!');
    const signer = new TypedEthereumSigner(key);
    return signer.publicKey;
  }

  const response = await serverInit();
  const pubKey = response.toString('hex');
  return res.status(200).json({ pubKey: pubKey });
});

app.post('/signData', async (req, res) => {
  async function signDataOnServer(signatureData) {
    const key = process.env.PRIVATE_KEY; // your private key
    if (!key) throw new Error('Private key is undefined!');
    const signer = new TypedEthereumSigner(key);
    return Buffer.from(await signer.sign(signatureData));
  }
  const body = JSON.parse(req.body);
  const signatureData = Buffer.from(body.signatureData, 'hex');
  const signature = await signDataOnServer(signatureData);
  res.status(200).json({ signature: signature.toString('hex') });
});

app.get('/writings', async (req, res) => {
  console.log('inside here, prims0, ', prisma);
  const day = await prisma.day.findMany({});
  console.log('the writings are:', day);
  res.json(day);
});

app.post('/upload-writing', async (req, res) => {
  console.log('inside the upload writing route');
  try {
    console.log('IN HERE', req.body);
    const { text, date } = req.body;
    console.log('Time to save the writing of today');

    if (!text || !date) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const bundlrResponseId = await uploadToBundlr(text);

    res.status(201).json({ bundlrResponseId });
  } catch (error) {
    console.error('An error occurred while handling your request:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to test push notification
app.post('/test-push', async (req, res) => {
  // Your existing code
  res.json({ status: 'processing' });

  // Simulate delay
  setTimeout(async () => {
    try {
      // generateCharacterStory(character, writing);
      // Logic to generate character story goes here
      // ...

      // Sending notification to all subscribers
      subscriptions.forEach(sub => {
        webpush.sendNotification(sub, 'Your character is ready to be minted.');
      });
    } catch (error) {
      console.error(error);
      // Handle error
    }
  }, 60000); // 4 minutes
});

app.post('/subscribe', async (req, res) => {
  const walletAddress = req.body.walletAddress;
  const subInfo = req.body.subscription;

  // Find or Create a User
  let user = await prisma.user.upsert({
    where: { walletAddress },
    update: {},
    create: { walletAddress },
  });

  // Save subscription to database
  await prisma.subscription.create({
    data: {
      subInfo,
      userId: user.id,
    },
  });

  res.status(201).json({});
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
