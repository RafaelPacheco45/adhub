export async function openYouTube(container){
 if(!navigator.serviceWorker||!window.WebAssembly||!window.SharedWorker)throw Error('Navegador não compatível');
 const {ScramjetController}=$scramjetLoadController();
 const controller=new ScramjetController({prefix:'/service/',files:{wasm:'/scram/scramjet.wasm.wasm',all:'/scram/scramjet.all.js',sync:'/scram/scramjet.sync.js'}});await controller.init();
 await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 const connection=new BareMux.BareMuxConnection('/baremux/worker.js');await connection.setTransport('/libcurl/index.mjs',[{websocket:`${location.protocol==='https:'?'wss':'ws'}://${location.host}/wisp/`}]);
 const frame=controller.createFrame();frame.frame.id='youtube-site';frame.frame.title='YouTube';frame.frame.allow='autoplay; encrypted-media';let lastVideo=null,closed=false;
 frame.addEventListener('urlchange',e=>{const url=new URL(e.url),video=url.pathname==='/watch'?url.searchParams.get('v'):null;if(video&&video!==lastVideo){lastVideo=video;setTimeout(()=>{if(!closed)frame.reload();},0);}else if(!video)lastVideo=null;});
 container.append(frame.frame);frame.go('https://www.youtube.com/');return {close(){closed=true;frame.frame.remove();}};
}
