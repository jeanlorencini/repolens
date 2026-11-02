// Render the original vector artwork into Chromium's required PNG sizes.
const sharp = require('sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
(async () => {
  for (const size of [16, 32, 48, 128]) {
    await sharp(path.join(root, 'icons/repolens.svg')).resize(size, size)
      .png().toFile(path.join(root, `icons/icon-${size}.png`));
  }
  console.log('Rendered icons: 16, 32, 48 and 128 pixels.');
})();
