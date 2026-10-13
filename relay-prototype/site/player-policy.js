// Reference policy, not a finished browser player. Strict fail-closed offline lease.
export class PlaybackLease {
  #manifest=null; #receivedMono=0; #receivedWall=0; #rtt=0;
  invalidate(){this.#manifest=null;}
  install(manifest,{sentMono,receivedMono,receivedWall}){
    this.invalidate();
    const rtt=receivedMono-sentMono;
    const issued=Date.parse(manifest?.server_time),end=Date.parse(manifest?.valid_until);
    if(manifest?.state!=='ready'||manifest.mode!=='test'||!Number.isFinite(issued)||!Number.isFinite(end)
      ||!Number.isFinite(rtt)||rtt<0||rtt>2000||end<=issued||end-issued>300000
      ||!Array.isArray(manifest.items)||!manifest.items.length) return false;
    this.#manifest=structuredClone(manifest);this.#receivedMono=receivedMono;
    this.#receivedWall=receivedWall;this.#rtt=rtt;
    return true;
  }
  interval({mono,wall}){
    if(!this.#manifest)return null;
    const age=mono-this.#receivedMono,wallAge=wall-this.#receivedWall;
    // performance.now behavior across sleep differs by platform. Any divergent
    // clock, backward jump, or long unobserved gap is a reason to resync online.
    if(!Number.isFinite(age)||!Number.isFinite(wallAge)||age<0||wallAge<0||Math.abs(age-wallAge)>2000){this.invalidate();return null;}
    const lower=Date.parse(this.#manifest.server_time)+age;
    const upper=lower+this.#rtt+250; // conservative network/clock uncertainty margin
    if(upper>=Date.parse(this.#manifest.valid_until)){this.invalidate();return null;}
    return {lower,upper};
  }
  canStart(itemId,cached,{mono,wall}){
    const clock=this.interval({mono,wall});if(!clock)return false;
    const item=this.#manifest.items.find(i=>i.item_id===itemId);if(!item)return false;
    if(!cached || cached.asset_id!==item.asset_id||cached.sha256!==item.sha256||cached.storage_version!==item.storage_version
      ||cached.bytes!==item.size_bytes||cached.verified!==true) return false;
    const start=Date.parse(item.starts_at),end=Math.min(Date.parse(item.ends_at),Date.parse(this.#manifest.valid_until));
    if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isInteger(item.duration_ms)||item.duration_ms<=0||item.duration_ms>15000)return false;
    return clock.lower>=start && clock.upper+item.duration_ms<end;
  }
  mustStop(itemId,time){
    const clock=this.interval(time);if(!clock)return true;
    const item=this.#manifest.items.find(i=>i.item_id===itemId);
    return !item||clock.upper>=Math.min(Date.parse(item.ends_at),Date.parse(this.#manifest.valid_until));
  }
}
