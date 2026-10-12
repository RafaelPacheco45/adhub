import assert from 'node:assert/strict';
const endpoint='https://xvutqwybxslmvnrreedx.supabase.co/functions/v1/youtube-remote-pages',origin=process.env.TEST_ORIGIN||'https://rafaelpacheco45.github.io';
async function call(op,token,extra={},expected=200){const r=await fetch(endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({op,...extra})});assert.equal(r.status,expected,op+' HTTP status');return r.json();}
let a,b;
try{
 a=await call('create');b=await call('create');assert.notEqual(a.display_token,b.display_token);
 await call('poll',a.control_token,{},401);await call('send',a.display_token,{video_id:'M7lc1UVf-VE'},401);
 await call('send',a.control_token,{video_id:'M7lc1UVf-VE'});
 const p=await call('poll',a.display_token);assert.equal(p.video_id,'M7lc1UVf-VE');assert.equal((await call('poll',b.display_token)).video_id,null);
 await call('ack',a.display_token,{revision:p.revision,state:'ready'});assert.equal((await call('status',a.control_token)).playback,'ready');
 await call('close',a.display_token);await call('status',a.control_token,{},401);a=null;
 console.log('PASS live: create, controller/display separation, send, poll, isolated second screen, acknowledgement and close/revocation.');
}finally{if(a)await call('close',a.display_token);if(b)await call('close',b.display_token);}
