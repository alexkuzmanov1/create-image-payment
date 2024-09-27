const sharp = require('sharp');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const multer = require('multer');
const axios = require('axios');

// Folder to save the new images
const outputDir = path.join(__dirname, 'output-images');

// Ensure output directory exists
fs.ensureDirSync(outputDir);

const upload = multer({ dest: 'uploads/' });


// Function to overlay text and logos on a constant image
async function createImage({ email, amount, appName, appLogoPath, providerLogoPath }) {
    const baseImagePath = 'template.png'; // Update this to the path of your constant image
    const outputImagePath = path.join(outputDir, `${email}-${Date.now()}.png`);

    try {
        // Load base image
        let image = sharp(baseImagePath).resize(1004, 1004);

        // Load and process app logo to be circular
        console.log(`Loading app logo from: ${appLogoPath}`);
        const appLogo = await sharp(appLogoPath)
            .resize(128, 128)
            .composite([{ input: Buffer.from('<svg><circle cx="64" cy="64" r="64"/></svg>'), blend: 'dest-in' }])
            .png()
            .toBuffer();
        console.log('App logo loaded and processed successfully.');

        // Load provider logo
        console.log(`Loading provider logo from: ${providerLogoPath}`);
        const providerLogo = await sharp(providerLogoPath).resize(288, 74).toBuffer();
        console.log('Provider logo loaded successfully.');

        // Create SVG for text overlay
        // Create SVG for text overlay
        // Create SVG for text overlay
        const svgText = `
    <svg width="1000" height="1000">
        <style>
            .email { font-family: 'Poppins'; font-size: 50px; font-weight: 700; text-transform: uppercase; fill: white; width: 725px; }
            .amount { font-family: 'Poppins'; font-size: 70px; font-weight: 700; text-transform: uppercase; fill: white; width: 399px; height: 161px; }
            .app { font-family: 'Poppins'; font-size: 40px; font-weight: 700; text-transform: uppercase; fill: white; width: 363px; height: 90px; }
        </style>
        <text x="259" y="86" class="email">${email}</text>
        <text x="575" y="579" class="amount">${amount} BGN</text>
        <text x="512" y="924" class="app">${appName}</text>
        <image href="${providerLogoPath}" x="800" y="691" width="288" height="74" />
    </svg>
`;
        const svgBuffer = Buffer.from(svgText);

        // Composite logos and text onto the base image
        image = image
            .composite([
                { input: appLogo, top: 850, left: 848 }, // Adjust the position as needed
                { input: providerLogo, top: 691, left: 634 }, // Adjust the position as needed
                { input: svgBuffer, top: 0, left: 0 } // Adjust the position as needed
            ])
            .png();

        // Save the final image
        await image.toFile(outputImagePath);
        console.log(`Image created successfully: ${outputImagePath}`);
    } catch (error) {
        console.error('Error creating image:', error);
    }
}

// Set up Express server
const app = express();
const port = 3000;

app.post('/uploadImage', upload.fields([
    { name: 'appLogo', maxCount: 1 },
    { name: 'providerLogo', maxCount: 1 }
]), async (req, res) => {
    const { email, amount, appName } = req.body;
    const appLogoPath = req.files.appLogo[0].path;
    const providerLogoPath = req.files.providerLogo[0].path;

    try {
        const outputImagePath = await createImage({ email, amount, appName, appLogoPath, providerLogoPath });
        res.status(200).json({ message: 'Image created successfully', imagePath: outputImagePath });
    } catch (error) {
        res.status(500).send('Error creating image');
    } finally {
        // Clean up uploaded files
        fs.unlinkSync(appLogoPath);
        fs.unlinkSync(providerLogoPath);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});