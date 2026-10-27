/* Sailor Logbook — MIT. Uses the owner’s original artwork without altering its design. */
(function(root){
  const mark=(size=64)=>`<img class="brand-mark" src="icons/brand-icon.svg" width="${Number(size)||64}" height="${Number(size)||64}" alt="" aria-hidden="true">`;
  let image=null;
  const loaded=typeof Image==='undefined'?Promise.resolve(null):new Promise(resolve=>{image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src='icons/icon-512.png';});
  function paint(context,x,y,size){if(image?.complete&&image.naturalWidth)context.drawImage(image,x,y,size,size);}
  const api={name:'Sailor Logbook',shortName:'Logbook',mark,paint,ready:()=>loaded};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LogbookBrand=api;
})(typeof globalThis!=='undefined'?globalThis:this);
