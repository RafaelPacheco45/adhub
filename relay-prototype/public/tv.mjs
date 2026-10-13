import {openYouTube} from './relay-player.mjs';
const token=location.hash.slice(1),headers={Authorization:'Bearer '+token},screen=document.getElementById('screen'),slots=['left-ad','right-ad','bottom-ad'].map(id=>document.getElementById(id));
let player,asset='',imageUrl='',pollTimer,leaseTimer,boundaryTimer,stopped=false,refreshing=false;
function clearAds(){screen.dataset.layout='none';slots.forEach(s=>{s.hidden=true;s.querySelector('img').removeAttribute('src');});if(imageUrl)URL.revokeObjectURL(imageUrl);asset='';imageUrl='';}
function stop(){stopped=true;clearTimeout(pollTimer);clearTimeout(leaseTimer);clearTimeout(boundaryTimer);clearAds();player?.close();document.getElementById('failure').hidden=false;}
async function refresh(){if(stopped||refreshing)return;refreshing=true;const receivedAt=performance.now();try{
 const response=await fetch('/api/tv/manifest',{headers,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8000)});if(response.status===401){stop();return;}if(!response.ok)throw Error();const m=await response.json();
 if(!player)player=await openYouTube(document.getElementById('youtube'));
 document.getElementById('failure').hidden=true;
 if(m.state==='active'){
  if(asset!==m.asset){const r=await fetch('/api/tv/art',{headers,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();const blob=await r.blob(),next=URL.createObjectURL(blob);try{await new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=reject;im.src=next;});}catch(e){URL.revokeObjectURL(next);throw e;}clearAds();imageUrl=next;asset=m.asset;}
  const elapsed=performance.now()-receivedAt,lease=m.leaseUntil-m.serverTime-elapsed,remaining=m.end-m.serverTime-elapsed;
  if(lease<=0||remaining<=0){clearAds();return;}clearTimeout(leaseTimer);clearTimeout(boundaryTimer);
  screen.dataset.layout=m.layout;const visible={right:[false,true,false],two_sides:[true,true,false],bottom:[false,false,true],right_bottom:[false,true,true],square:[false,true,false]}[m.layout];
  if(!visible)throw Error();slots.forEach((s,i)=>{s.hidden=!visible[i];if(visible[i])s.querySelector('img').src=imageUrl;});
  leaseTimer=setTimeout(clearAds,lease);boundaryTimer=setTimeout(clearAds,Math.min(2147483647,remaining));
 }else{clearTimeout(leaseTimer);clearTimeout(boundaryTimer);clearAds();if(m.state==='scheduled')boundaryTimer=setTimeout(refresh,Math.min(2147483647,Math.max(100,m.start-m.serverTime)));}
 }catch{if(!player){document.getElementById('failure').hidden=false;}/* Existing ads expire via the short server lease. */}
 finally{refreshing=false;if(!stopped){clearTimeout(pollTimer);pollTimer=setTimeout(refresh,5000);}}}
if(/^[a-f0-9]{64}$/.test(token))refresh();else stop();
window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(pollTimer);clearTimeout(leaseTimer);clearTimeout(boundaryTimer);player?.close();clearAds();});
