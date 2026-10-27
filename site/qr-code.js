// Static, independently decoded QR for https://mommabees-website.pages.dev/
// Error correction M; generated offline, verified to decode to exact homepage URL.
// No third-party QR service, trackers, or API calls.
export const HOME_URL='https://mommabees-website.pages.dev/';
const QR_SIZE=37;
const PACKED='AAAAAAAAAAAAAAAAAAAAAAAAAP79e/gEFWYQQC6WSLoBdfSV0AujNy6AQQpZBAP6qq/gAB07AAC3bHJYBoa1/EAXtzgMAOgwfxAFabYGAAYRyRwCXfPs4ByGd+IA+4ol0AInGUuALOnKSABwH4lAByL+/gAAXBR8A/qLa0AQX/cZALpRz6AF126uQC6+HEoBBIszoA/oo8kAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
function qrMatrix(){
 const bin=atob(PACKED);const result=[];
 for(let y=0;y<QR_SIZE;y++){
  const row=[];
  for(let x=0;x<QR_SIZE;x++){const bit=y*QR_SIZE+x;row.push(!!(bin.charCodeAt(bit>>3)&(128>>(bit%8))));}
  result.push(row);
 }
 return result;
}
export function qrSvg(){
 const matrix=qrMatrix();let segments='';
 for(let y=0;y<QR_SIZE;y++)for(let x=0;x<QR_SIZE;x++)
  if(matrix[y][x])segments+='M'+(x+4)+' '+(y+4)+'h1v1h-1z';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="300" height="300" role="img" aria-labelledby="qr-title" shape-rendering="crispEdges">'+
 '<title id="qr-title">Scan QR code to visit Mamma Bee\'s Bakery homepage</title>'+
 '<rect width="45" height="45" fill="#ffffff"/><path fill="#1b1713" d="'+segments+'"/></svg>';
}
export function qrMarkup(){
 return '<div class="bakery-qr-panel"><div class="bakery-qr-art">'+qrSvg()+'</div>'+
 '<div><h2>Scan to Visit Our Bakery</h2><p>Open Mamma Bee\'s Bakery on your phone to view the shop, baking dates, and Past Bakes gallery.</p>'+
 '<p class="small">QR destination: <a href="'+HOME_URL+'">'+HOME_URL+'</a></p>'+
 '<div class="qr-actions"><button type="button" class="button" data-qr-download="svg">Download SVG</button>'+
 '<button type="button" class="button secondary" data-qr-download="png">Download PNG</button>'+
 '<button type="button" class="button secondary" data-qr-print>Print / Save as PDF</button></div>'+
 '<p class="small" role="status" id="qr-download-feedback"></p></div></div>';
}
function saveFile(blob,name){
 const url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
export function bindQrActions(root=document){
 root.querySelectorAll('[data-qr-download]').forEach(button=>button.onclick=async()=>{
  const kind=button.dataset.qrDownload;const feedback=root.querySelector('#qr-download-feedback');
  try{
   const svg=qrSvg();
   if(kind==='svg'){
    saveFile(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'MammaBeesBakery-Homepage-QR.svg');
   }else{
    const canvas=document.createElement('canvas'),size=900;canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unsupported');
    const img=new Image();
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
     ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,size,size);
    }finally{URL.revokeObjectURL(url);}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw Error('Could not create PNG');saveFile(blob,'MammaBeesBakery-Homepage-QR.png');
   }
   if(feedback)feedback.textContent='QR image prepared for download.';
  }catch(err){if(feedback)feedback.textContent='Download unavailable: '+err.message;}
 });
 root.querySelectorAll('[data-qr-print]').forEach(button=>button.onclick=()=>window.print());
}
