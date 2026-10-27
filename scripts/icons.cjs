/* Render the owner's original SVG artwork into an opaque, full-bleed install container. */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'svg icons and animations','sailor_logbook_logo.svg'),'utf8');
// The original SVG has a pre-rounded outer frame. Square only that frame for
// installation, including its four blue corner paths; the OS supplies the mask.
// All inner curves, ruled-paper strokes, gradients and proportions stay intact.
let icon=source.replaceAll('width="1080" height="1080" rx="240"','width="1080" height="1080"');
for(const [rounded,square]of [
  ['H840C972.548 1080 1080 972.548 1080 840Z','H1080V840Z'],
  ['H240C107.452 0 0 107.452 0 240Z','H0V240Z'],
  ['V240C1080 107.452 972.548 0 840 0Z','V0H840Z'],
  ['V840C0 972.548 107.452 1080 240 1080Z','V1080H240Z']
]){
  if(icon.split(rounded).length!==3)throw Error('The original SVG corner changed; review install framing.');
  icon=icon.replaceAll(rounded,square);
}
fs.writeFileSync(path.join(root,'icons','app-icon.svg'),icon);
(async()=>{
  for(const [name,size]of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32]]){
    await sharp(Buffer.from(icon),{density:192}).resize(size,size).flatten({background:'#226192'}).png().toFile(path.join(root,'icons',name));
  }
  console.log('Installed icons rendered edge-to-edge from the owner’s SVG. Original artwork is untouched.');
})().catch(error=>{console.error(error);process.exitCode=1;});
