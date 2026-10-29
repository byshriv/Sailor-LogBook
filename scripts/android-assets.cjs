// Android install sizes from the frozen existing artwork. No source artwork is changed.
const sharp = require('sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const res = path.join(root, 'platforms/android/app/src/main/res');
(async () => {
  for (const [density, scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
    for (const name of ['ic_launcher.png','ic_launcher_round.png'])
      await sharp(path.join(root,'icons/icon-512.png')).resize(48*scale,48*scale).png()
        .toFile(path.join(res,`mipmap-${density}`,name));
    // Inset the unchanged full-bleed artwork into Android's adaptive safe area.
    const size=108*scale, inner=66*scale;
    const artwork=await sharp(path.join(root,'icons/icon-maskable-512.png')).resize(inner,inner).png().toBuffer();
    await sharp({create:{width:size,height:size,channels:4,background:'#173e59'}})
      .composite([{input:artwork,gravity:'centre'}]).png()
      .toFile(path.join(res,`mipmap-${density}`,'ic_launcher_foreground.png'));
  }
  console.log('Android launcher assets rendered from existing Logbook artwork.');
})().catch(error=>{console.error(error);process.exitCode=1;});
