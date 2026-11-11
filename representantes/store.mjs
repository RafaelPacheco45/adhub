import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {CONTRACT_VERSION,leadTypes,publicLead,split} from './domain.mjs';
import {CONTRACT_HASH} from './contract.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const now = () => new Date().toISOString();
const normalizeEmail = value => String(value||'').trim().toLowerCase();
export class BusinessError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const assert = (ok,msg,status=400) => {if(!ok)throw new BusinessError(msg,status);};
const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
function hashPassword(password,salt=randomBytes(16).toString('hex')){return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
function checkPassword(password,encoded){const [salt,hex]=encoded.split(':');const actual=scryptSync(password,salt,64),expected=Buffer.from(hex,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export class RepresentativeStore {
  constructor(path=':memory:') {
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS representatives (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, city TEXT NOT NULL, password_hash TEXT NOT NULL, referral_code TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending_review', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, representative_id TEXT NOT NULL REFERENCES representatives(id), expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS acceptances (representative_id TEXT NOT NULL REFERENCES representatives(id), version TEXT NOT NULL, contract_hash TEXT NOT NULL, signed_name TEXT NOT NULL, accepted_at TEXT NOT NULL, PRIMARY KEY(representative_id,version));
    CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, representative_id TEXT NOT NULL REFERENCES representatives(id), type TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL, converted_at TEXT, UNIQUE(representative_id,type,email));
    CREATE TABLE IF NOT EXISTS commissions (id TEXT PRIMARY KEY, representative_id TEXT NOT NULL REFERENCES representatives(id), lead_id TEXT NOT NULL REFERENCES leads(id), order_reference TEXT NOT NULL UNIQUE, gross_cents INTEGER NOT NULL, commission_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, approved_at TEXT, paid_at TEXT);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  record(actor,action,target,detail={}){this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),actor,action,target,JSON.stringify(detail),now());}
  register({name,email,city,password}) {
    name=String(name||'').trim();city=String(city||'').trim();email=normalizeEmail(email);
    assert(name.length>=5&&name.length<=120,'Informe seu nome completo.');
    assert(city.length>=2&&city.length<=100,'Informe sua cidade.');
    assert(validEmail(email),'Informe um e-mail válido.');
    assert(typeof password==='string'&&password.length>=12&&password.length<=128,'A senha deve ter de 12 a 128 caracteres.');
    assert(!this.db.prepare('SELECT 1 FROM representatives WHERE email=?').get(email),'E-mail já cadastrado.',409);
    const id=randomUUID(),code=randomBytes(5).toString('hex').toUpperCase();
    this.db.prepare('INSERT INTO representatives(id,name,email,city,password_hash,referral_code,created_at) VALUES(?,?,?,?,?,?,?)').run(id,name,email,city,hashPassword(password),code,now());
    this.record(id,'registration',id);return {id,name,email,code,status:'pending_review'};
  }
  login(email,password) {
    const row=this.db.prepare('SELECT * FROM representatives WHERE email=?').get(normalizeEmail(email));
    if(!row||typeof password!=='string'||!checkPassword(password,row.password_hash))throw new BusinessError('E-mail ou senha incorretos.',401);
    const token=randomBytes(32).toString('hex');const expiration=new Date(Date.now()+7*86400000).toISOString();
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),row.id,expiration);
    this.record(row.id,'login',row.id);return {token,expires_at:expiration};
  }
  session(token) {
    if(!/^[0-9a-f]{64}$/.test(token||''))throw new BusinessError('Sessão inválida.',401);
    const row=this.db.prepare('SELECT r.* FROM sessions s JOIN representatives r ON r.id=s.representative_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),now());
    if(!row)throw new BusinessError('Sessão expirada.',401);return row;
  }
  logout(token) {this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));}
  me(user){return {id:user.id,name:user.name,email:user.email,city:user.city,referral_code:user.referral_code,status:user.status,contract_accepted:!!this.db.prepare('SELECT 1 FROM acceptances WHERE representative_id=? AND version=? AND contract_hash=?').get(user.id,CONTRACT_VERSION,CONTRACT_HASH)};}
  accept(user,{signed_name,version,hash}) {
    assert(version===CONTRACT_VERSION&&hash===CONTRACT_HASH,'O termo foi atualizado. Recarregue antes de aceitar.',409);
    assert(String(signed_name||'').trim().toLocaleLowerCase('pt-BR')===user.name.toLocaleLowerCase('pt-BR'),'Assine usando seu nome cadastrado.');
    this.db.prepare('INSERT OR IGNORE INTO acceptances VALUES(?,?,?,?,?)').run(user.id,version,hash,user.name,now());
    this.record(user.id,'contract_draft_acknowledged',user.id,{version,hash});
    return {ok:true,contract_accepted:true,status:'pending_review',notice:'Aceite de minuta registrado; a participação depende de contrato definitivo e aprovação.'};
  }
  lead(user,{type,name,email}) {
    assert(!!this.me(user).contract_accepted,'Leia e aceite a minuta antes de cadastrar indicações.',403);
    assert(leadTypes.includes(type),'Tipo de indicação inválido.');name=String(name||'').trim();email=normalizeEmail(email);
    assert(name.length>=2&&name.length<=120&&validEmail(email),'Informe nome e e-mail válidos.');
    assert(email!==user.email,'Não é permitido indicar a própria conta.');
    assert(!this.db.prepare('SELECT 1 FROM leads WHERE representative_id=? AND type=? AND email=?').get(user.id,type,email),'Indicação já cadastrada.',409);
    const id=randomUUID();this.db.prepare('INSERT INTO leads(id,representative_id,type,name,email,created_at) VALUES(?,?,?,?,?,?)').run(id,user.id,type,name,email,now());
    this.record(user.id,'lead_created',id,{type});return publicLead(this.db.prepare('SELECT * FROM leads WHERE id=?').get(id));
  }
  leads(user){return this.db.prepare('SELECT * FROM leads WHERE representative_id=? ORDER BY created_at DESC').all(user.id).map(publicLead);}
  commissions(user){return this.db.prepare('SELECT id,lead_id,order_reference,gross_cents,commission_cents,status,created_at,approved_at,paid_at FROM commissions WHERE representative_id=? ORDER BY created_at DESC').all(user.id);}
  // A rota administrativa não é disponibilizada neste módulo até integração ao financeiro oficial.
  // Jamais gerar comissão a partir de um comprovante enviado pelo próprio representante.
  previewCommission(grossCents){return split(grossCents);}
  close(){this.db.close();}
}
