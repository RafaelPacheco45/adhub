const TOKEN=/^[a-f0-9]{64}$/;
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const secret=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
export function createHandler(db,origins){const allowed=Array.isArray(origins)?origins:[origins];return async req=>{
 const origin=req.headers.get('origin');
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
 const reply=(data,status=200)=>Response.json(data,{status,headers});
 if(!allowed.includes(origin))return reply({error:'origin_not_allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST'||!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'invalid_request'},400);
 try{
  const reader=req.body?.getReader();if(!reader)return reply({error:'invalid_request'},400);let size=0,text='';const dec=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'too_large'},413);}text+=dec.decode(value,{stream:true});}text+=dec.decode();
  const b=JSON.parse(text);const keys={create:['op'],poll:['op'],status:['op'],close:['op'],send:['op','video_id'],ack:['op','revision','state']};
  if(!b||!keys[b.op]||Object.keys(b).some(k=>!keys[b.op].includes(k)))return reply({error:'invalid_request'},400);
  let display,control;const token=req.headers.get('authorization')?.replace(/^Bearer /,'');
  if(b.op!=='create'&&!TOKEN.test(token||''))return reply({error:'invalid_session'},401);
  if(b.op==='send'&&!/^[A-Za-z0-9_-]{11}$/.test(b.video_id||''))return reply({error:'invalid_video'},400);
  if(b.op==='ack'&&(!Number.isInteger(b.revision)||!['ready','playing','paused','blocked','error','ended'].includes(b.state)))return reply({error:'invalid_ack'},400);
  if(b.op==='create'){display=secret();control=secret();}
  const {data,error}=await db.rpc('adhub_remote_dispatch',{p_op:b.op,p_hash:await hash(display||token),p_other_hash:control?await hash(control):null,p_video:b.video_id||null,p_revision:b.revision??null,p_state:b.state||null});
  if(error)return reply({error:error.code==='42501'?'invalid_session':error.code==='P0001'?'try_later':'unavailable'},error.code==='42501'?401:error.code==='P0001'?429:503);
  return reply(b.op==='create'?{...data,display_token:display,control_token:control}:data);
 }catch{return reply({error:'invalid_request'},400);}
};}
