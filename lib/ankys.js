require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const prisma = require("../lib/prismaClient");
const {
  uploadMetadataToPinata,
  uploadImageToPinata,
} = require("../lib/pinataSetup");

const checkAndUpdateAnkys = async () => {
  const ankys = await prisma.generatedAnky.findMany({
    where: {
      OR: [
        { imagineApiStatus: "pending" },
        { imagineApiStatus: "in-progress" },
        { imagineApiStatus: "failed" },
      ],
    },
  });

  for (const anky of ankys) {
    try {
      const response = await axios.get(
        `http://${process.env.MIDJOURNEY_SERVER_IP}:8055/items/images/${anky.imagineApiID}`,
        {
          headers: { Authorization: `Bearer ${process.env.IMAGINE_API_TOKEN}` },
        }
      );
      const apiData = response.data.data;
      if (apiData.status === "completed") {
        // Assuming uploadImageToPinata function takes buffer and returns IPFS hash
        const randomUpscaledId =
          apiData.upscaled[Math.floor(Math.random() * apiData.upscaled.length)];
        const thisImageUrl = `http://${process.env.MIDJOURNEY_SERVER_IP}:8055/assets/${randomUpscaledId}/${randomUpscaledId}.png`;

        const imageBuffer = await axios
          .get(thisImageUrl, { responseType: "arraybuffer" })
          .then((res) => res.data);
        const ipfsHash = await uploadImageToPinata(imageBuffer, anky.cid);
        if (!ipfsHash) return;
        const nftMetadata = {
          name: "you",
          description: anky.ankyBio,
          image: `ipfs://${ipfsHash}`,
        };
        const ipfsMetadataHash = await uploadMetadataToPinata(nftMetadata);
        if (!ipfsMetadataHash) return;
        await prisma.generatedAnky.update({
          where: { cid: anky.cid },
          data: {
            imagineApiStatus: apiData.status,
            imageIPFSHash: ipfsHash,
            metadataIPFSHash: ipfsMetadataHash,
          },
        });
        // NOW IT IS TIME TO CREATE THE NFT. WORK HERE:

        const cast = `your anky is ready to be minted:\n\nhttps://api.anky.lat/farcaster-frames/mintable-ankys?cid=${anky.cid}`;
        let castOptions = {
          parent: `https://warpcast.com/~/channel/anky`,
          text: cast,
          embeds: [
            {
              url: `https://api.anky.lat/farcaster-frames/mintable-ankys?cid=${anky.cid}`,
            },
          ],
          signer_uuid: process.env.MFGA_SIGNER_UUID,
        };
        const response = await axios.post(
          "https://api.neynar.com/v2/farcaster/cast",
          castOptions,
          {
            headers: {
              api_key: process.env.MFGA_API_KEY,
            },
          }
        );
        await prisma.generatedAnky.update({
          where: { cid: anky.cid },
          data: {
            castHash: response.data.cast.hash,
          },
        });
      } else if (apiData.status === "failed") {
        await createImageAgain(anky);
      } else {
        await prisma.generatedAnky.update({
          where: { cid: anky.cid },
          data: { imagineApiStatus: apiData.status },
        });
      }
    } catch (error) {
      console.error(
        `Error updating GeneratedAnky with cid ${anky.cid}: `,
        error?.response?.data?.errors || error
      );
    }
  }
};

const createImageAgain = async (anky) => {
  try {
    const config = {
      headers: { Authorization: `Bearer ${process.env.IMAGINE_API_TOKEN}` },
    };
    const responseFromImagineApi = await axios.post(
      `http://${process.env.MIDJOURNEY_SERVER_IP}:8055/items/images`,
      {
        prompt: anky.imagePrompt,
      },
      config
    );
    await prisma.generatedAnky.update({
      where: { cid: anky.cid },
      data: {
        imagineApiStatus: "pending",
        imagineApiID: responseFromImagineApi.data.data.id,
      },
    });
  } catch (error) {
    console.log("there was an error creating the image again.");
  }
};

module.exports = { checkAndUpdateAnkys };