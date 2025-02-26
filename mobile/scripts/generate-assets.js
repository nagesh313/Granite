const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

async function generateAssets() {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');

  // Generate icon.png (1024x1024)
  await sharp(path.join(assetsDir, 'icon.svg'))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  // Generate splash.png (2048x2048)
  await sharp(path.join(assetsDir, 'splash.svg'))
    .resize(2048, 2048)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  // Generate adaptive-icon.png (1024x1024)
  await sharp(path.join(assetsDir, 'icon.svg'))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));

  console.log('Generated all assets successfully');
}

generateAssets().catch(console.error);