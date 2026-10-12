const $=id=>document.getElementById(id);let controller,frame,busy=false;
function status(s){$('status').textContent=s;}
function layout(){const l=$('left').checked,r=$('right').checked,b=$('bottom').checked;for(const [id,on]of [['leftAd',l],['rightAd',r],['bottomAd',b]])$(id).hidden=!on;$('layout').style.gridTemplateColumns=`${l?'180px':'0'} minmax(0,1fr) ${r?'210px':'0'}`;$('layout').style.gridTemplateRows=`minmax(0,1fr) ${b?'90px':'0'}`;}
for(const id of ['left','right','bottom'])$(id).onchange=layout;layout();
$('start').onclick=async()=>{if(busy||frame)return;busy=true;$('start').disabled=true;status('Preparando a conexão…');try{
 if(!navigator.serviceWorker||!window.WebAssembly||!window.SharedWorker)throw Error('Este navegador não oferece todos os recursos exigidos pelo protótipo.');
 const {ScramjetController}=$scramjetLoadController();controller=new ScramjetController({prefix:'/service/',files:{wasm:'/scram/scramjet.wasm.wasm',all:'/scram/scramjet.all.js',sync:'/scram/scramjet.sync.js'}});await controller.init();
 await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 const connection=new BareMux.BareMuxConnection('/baremux/worker.js');await connection.setTransport('/libcurl/index.mjs',[{websocket:`ws://${location.host}/wisp/`}]);
 frame=controller.createFrame();frame.frame.id='youtube-site';frame.frame.title='YouTube intermediado';frame.frame.allow='autoplay; fullscreen; encrypted-media; picture-in-picture';
 let lastVideo=null;
 frame.addEventListener('urlchange',e=>{const url=new URL(e.url);status('Navegando: '+url.hostname+url.pathname);const video=url.pathname==='/watch'?url.searchParams.get('v'):null;
 // Scramjet 1.1.0 can stall YouTube's SPA transition. Refresh the real document
 // once per video transition; preserve the surrounding shell and native page.
 if(video&&video!==lastVideo){lastVideo=video;const current=frame;setTimeout(()=>{if(frame===current)current.reload();},0);}else if(!video)lastVideo=null;
 });
 $('empty').hidden=true;$('content').append(frame.frame);frame.go('https://www.youtube.com/');for(const id of ['back','home','stop','refresh'])$(id).disabled=false;status('Carregando YouTube…');
 }catch(e){status('Falha: '+e.message);$('start').disabled=false;}finally{busy=false;}};
$('back').onclick=()=>frame?.back();$('home').onclick=()=>frame?.go('https://www.youtube.com/');$('stop').onclick=()=>{frame?.frame.remove();frame=null;$('empty').hidden=false;$('start').disabled=false;for(const id of ['back','home','stop','refresh'])$(id).disabled=true;status('Navegação encerrada.');};
$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>status('Use a opção de tela cheia do navegador.'));};
setInterval(async()=>{try{const d=await(await fetch('/metrics')).json();$('metrics').textContent=`Recebidos pela TV: ${(d.down/1048576).toFixed(2)} MiB\nEnviados pela TV: ${(d.up/1048576).toFixed(2)} MiB\nConexões ativas: ${d.active}\nRAM do servidor: ${(d.rss/1048576).toFixed(1)} MiB\nTempo do servidor: ${d.seconds}s\nMedição do túnel inclui overhead. Não mede fps.`;}catch{}},2500);

$('refresh').onclick=()=>frame?.reload();
