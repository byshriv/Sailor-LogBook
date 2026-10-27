const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
// Exact copies of the owner’s SVGs. Existing installed PNG icons are not regenerated.
for(const [source,target] of [['sailor_logbook_logo.svg','brand-icon.svg'],['sailor_logbook_logo(Animated).svg','brand-animated.svg']]){
  fs.copyFileSync(path.join(root,'svg icons and animations',source),path.join(root,'icons',target));
}
console.log('Copied the owner’s unchanged SVG artwork. Existing PNG icons are preserved.');
