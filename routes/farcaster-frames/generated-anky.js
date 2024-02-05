const express = require("express");
const router = express.Router();
const axios = require("axios");
const { ethers } = require("ethers");
const prisma = require("../../lib/prismaClient");
const {
  uploadToPinataFromUrl,
  uploadMetadataToPinata,
} = require("../../lib/pinataSetup");
const { getCastFromNeynar } = require("../../lib/neynar");
const { createAnkyFromPrompt } = require("../../lib/midjourney");

///////////// GENERATED ANKY ////////////////////////

router.get("/", async (req, res) => {
  try {
    console.log("in here");
    const fullUrl = req.protocol + "://" + req.get("host");
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>anky mint</title>
      <meta property="og:title" content="anky mint">
      <meta property="og:image" content="https://jpfraneto.github.io/images/farcaster-future.png">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://jpfraneto.github.io/images/farcaster-future.png">
      <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames/generated-anky?cid=${req.query.cid}&revealed=1&choosingAnky=0&chosenAnky=0&mint=0">
      <meta name="fc:frame:button:1" content="reveal 🐒">
    </head>
    </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

router.post("/", async (req, res) => {
  const fullUrl = req.protocol + "://" + req.get("host");

  console.log("inside the post route here:", req.query.cid);
  console.log("the req.body is :", req.body);
  const anky = await prisma.generatedAnky.findUnique({
    where: { cid: req.query.cid },
  });
  console.log("this anky is: ", anky);
  if (
    anky &&
    req.query.revealed == 1 &&
    req.query.choosingAnky == 1 &&
    req.query.chosenAnky == 1 &&
    req.query.mint == 1
  ) {
    console.log("it is time to mint!");
    return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>anky mint</title>
      <meta property="og:title" content="anky mint">
      <meta property="og:image" content="https://jpfraneto.github.io/images/error.png">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://jpfraneto.github.io/images/error.png">
      <meta name="fc:frame:post_url" content="https://www.anky.lat">
      <meta name="fc:frame:button:1" content="write on anky">   
      <meta name="fc:frame:button:1:action" content="post_redirect">   
      </head>
    </html>
      `);
  }
  if (!anky) {
    console.log("there is no anky!");
    return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>anky mint</title>
      <meta property="og:title" content="anky mint">
      <meta property="og:image" content="https://jpfraneto.github.io/images/error.png">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://jpfraneto.github.io/images/error.png">
      <meta name="fc:frame:post_url" content="https://www.anky.lat">
      <meta name="fc:frame:button:1" content="write on anky">   
      <meta name="fc:frame:button:1:action" content="post_redirect">   
      </head>
    </html>
      `);
  }
  try {
    if (req.query.revealed == 1 && req.query.choosingAnky == 1) {
      console.log("the revealed and chosing anky!");
      let imageUrl;
      const buttonIndex = req.body.untrustedData.buttonIndex;
      switch (buttonIndex) {
        case 1:
          imageUrl = anky.imageOneUrl;
          break;
        case 2:
          imageUrl = anky.imageTwoUrl;
          break;
        case 3:
          imageUrl = anky.imageThreeUrl;
          break;
        case 4:
          imageUrl = anky.imageFourUrl;
          break;
      }

      const ipfsHash = await uploadToPinataFromUrl(imageUrl);
      if (!ipfsHash || ipfsHash == null) return;
      const nftMetadata = {
        name: "you",
        description: anky.ankyBio,
        image: `ipfs://${ipfsHash}`,
      };
      const ipfsMetadataHash = await uploadMetadataToPinata(nftMetadata);

      if (!ipfsMetadataHash || ipfsMetadataHash == null) return;

      await prisma.generatedAnky.update({
        where: { cid: req.query.cid },
        data: {
          chosenImageIndex: buttonIndex,
          imageIPFSHash: ipfsHash,
          metadataIPFSHash: ipfsMetadataHash,
        },
      });

      return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>anky mint</title>
        &chosenAnky=null
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content="${imageUrl}">
        <meta name="fc:frame:image" content="${imageUrl}">
        <meta name="fc:frame" content="vNext">
              <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames/generated-anky?cid=${req.query.cid}&revealed=1&choosingAnky=1&chosenAnky=${buttonIndex}&mint=1">
        <meta name="fc:frame:button:1" content="mint 👽">   
        </head>
      </html>
        `);
    }
    if (anky && req.query.revealed == 1) {
      console.log("right before the revealed route");
      return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>anky mint</title>
        &chosenAnky=null
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content="${anky.frameImageUrl}">
        <meta name="fc:frame:image" content="${anky.frameImageUrl}">
        <meta name="fc:frame" content="vNext">
              <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames/generated-anky?cid=${req.query.cid}&revealed=1&choosingAnky=1&mint=0">
        <meta name="fc:frame:button:1" content="1">   
        <meta name="fc:frame:button:2" content="2">   
        <meta name="fc:frame:button:3" content="3">   
        <meta name="fc:frame:button:4" content="4">   
        </head>
      </html>
        `);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

module.exports = router;
