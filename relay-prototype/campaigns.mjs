import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomUUID} from 'node:crypto';
export const layouts=Object.freeze({right:'Uma faixa lateral',two_sides:'Duas faixas laterais',bottom:'Uma faixa inferior',right_bottom:'Lateral e faixa inferior',square:'Um quadrado lateral'});
const hash=b=>createHash('sha256').update(b).digest('hex');
export class FlowError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function raster(input){
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input||'');
 if(!match)throw new FlowError('Envie uma imagem PNG, JPEG ou WebP.');
 const bytes=Buffer.from(match[2],'base64');if(bytes.length<12||bytes.length>2*1024*1024)throw new FlowError('A imagem deve ter até 2 MB.');
 const mime=match[1],valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)throw new FlowError('Formato da imagem inválido.');return {bytes,mime,sha:hash(bytes)};
}
export class CampaignStore{
 constructor(path,key,{origin='http://127.0.0.1:4219',now=()=>Date.now()}={}){this.db=new DatabaseSync(path);this.key=key;this.origin=origin;this.now=now;this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,title TEXT NOT NULL,venue TEXT NOT NULL,layout TEXT NOT NULL,start INTEGER NOT NULL,end INTEGER NOT NULL,mime TEXT NOT NULL,art BLOB NOT NULL,sha TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL,decided INTEGER,token_hash TEXT UNIQUE,decision_id TEXT);`);}
 token(id){return createHmac('sha256',this.key).update('tv-order-v1:'+id).digest('hex');}
 create(input){
  const title=String(input.title||'').trim(),venue=String(input.venue||'').trim(),start=Date.parse(input.start),end=Date.parse(input.end);
  if(title.length<2||title.length>100||venue.length<2||venue.length>100)throw new FlowError('Informe o anunciante e o estabelecimento (2 a 100 caracteres).');
  if(!Object.hasOwn(layouts,input.layout))throw new FlowError('Formato inválido.');
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end<=this.now()||end-start>366*86400000)throw new FlowError('Confira o início e o fim da campanha.');
  const art=raster(input.image),id=randomUUID();this.db.prepare('INSERT INTO orders(id,title,venue,layout,start,end,mime,art,sha,state,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,title,venue,input.layout,start,end,art.mime,art.bytes,art.sha,'pending',this.now());return this.detail(id);
 }
 detail(id){const row=this.db.prepare('SELECT id,title,venue,layout,start,end,mime,sha,state,created,decided FROM orders WHERE id=?').get(id);if(!row)throw new FlowError('Pedido não encontrado.',404);return {...row,layoutLabel:layouts[row.layout],payment:'simulated',tvUrl:row.state==='approved'?`${this.origin}/tv.html#${this.token(row.id)}`:null};}
 list(){return this.db.prepare('SELECT id FROM orders ORDER BY created DESC LIMIT 100').all().map(r=>this.detail(r.id));}
 decide(id,{decision,reviewed,requestId}){
  if(!['approve','reject'].includes(decision)||!/^[a-f0-9-]{36}$/i.test(requestId||''))throw new FlowError('Decisão inválida.');
  if(decision==='approve'&&reviewed!==true)throw new FlowError('Confirme a arte, o espaço e o período antes de aprovar.');
  this.db.exec('BEGIN IMMEDIATE');try{
   const row=this.db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!row)throw new FlowError('Pedido não encontrado.',404);
   if(row.state!=='pending'){if(row.decision_id===requestId&&row.state===(decision==='approve'?'approved':'rejected')){this.db.exec('COMMIT');return this.detail(id);}throw new FlowError('Este pedido já foi decidido. Atualize o painel.',409);}
   if(decision==='approve'&&row.end<=this.now())throw new FlowError('O período deste pedido já terminou.',409);
   if(decision==='approve'&&this.db.prepare("SELECT id FROM orders WHERE venue=? AND state='approved' AND start<? AND end>? LIMIT 1").get(row.venue,row.end,row.start))throw new FlowError('Já existe uma campanha aprovada neste estabelecimento e período. Neste protótipo, cada link usa uma composição exclusiva.',409);
   this.db.prepare('UPDATE orders SET state=?,decided=?,token_hash=?,decision_id=? WHERE id=?').run(decision==='approve'?'approved':'rejected',this.now(),decision==='approve'?hash(this.token(id)):null,requestId,id);
   this.db.exec('COMMIT');return this.detail(id);
  }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw e;}
 }
 revoke(id){const row=this.detail(id);if(row.state!=='approved')throw new FlowError('Somente um link aprovado pode ser encerrado.',409);this.db.prepare("UPDATE orders SET state='revoked',token_hash=NULL WHERE id=?").run(id);return this.detail(id);}
 authorize(token){if(!/^[a-f0-9]{64}$/.test(token||''))throw new FlowError('Link indisponível.',401);const row=this.db.prepare("SELECT * FROM orders WHERE token_hash=? AND state='approved'").get(hash(token));if(!row)throw new FlowError('Link indisponível.',401);return row;}
 manifest(token){const r=this.authorize(token),now=this.now();return {state:now<r.start?'scheduled':now>=r.end?'ended':'active',layout:r.layout,asset:r.sha,start:r.start,end:r.end,serverTime:now,leaseUntil:Math.min(now+30000,r.end)};}
 asset(token){const row=this.authorize(token);if(this.now()<row.start||this.now()>=row.end)throw new FlowError('Fora do período contratado.',403);return {mime:row.mime,bytes:row.art};}
 preview(id){const row=this.db.prepare('SELECT mime,art FROM orders WHERE id=?').get(id);if(!row)throw new FlowError('Pedido não encontrado.',404);return {mime:row.mime,bytes:row.art};}
 close(){this.db.close();}
}
