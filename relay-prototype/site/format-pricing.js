(function(root){
'use strict';
const keys=['full','square','side','bottom'];
const labels={full:'Tela inteira',square:'Quadrado',side:'Faixa lateral',bottom:'Faixa inferior'};
const valid=c=>Number.isSafeInteger(c)&&c>0&&c<=100000000;
function prices(v){
  const raw=v&&v.format_prices_cents, result={full:null,square:null,side:null,bottom:null};
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    keys.forEach(k=>{if(valid(raw[k]))result[k]=raw[k]});
  }else if(v&&!Object.prototype.hasOwnProperty.call(v,'format_prices_cents')){
    const legacy=v.weekly_price_cents??v.rate;if(valid(legacy))result.full=legacy;
  }
  return result;
}
function price(v,key){return keys.includes(key)?prices(v)[key]:null}
function minimum(v){const values=Object.values(prices(v)).filter(valid);return values.length?Math.min(...values):null}
function parseBRL(input){
  const s=String(input??'').trim();if(!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(s))return null;
  const [whole,decimal='']=s.replace(',','.').split('.');const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));return valid(cents)?cents:null;
}
function split(cents){if(!valid(cents))return null;const fee=Math.floor((cents*1500+5000)/10000);return{fee,net:cents-fee}}
function quote(venues,format,weeks){
  const missing=venues.filter(v=>price(v,format)===null).map(v=>v?.id||'unknown');
  if(!keys.includes(format)||!Number.isInteger(weeks)||weeks<1||weeks>52||missing.length)return{media:null,available:false,missing};
  const media=venues.reduce((sum,v)=>sum+price(v,format)*weeks,0);
  return Number.isSafeInteger(media)?{media,available:true,missing:[]}:{media:null,available:false,missing:[]};
}
const api={keys,labels,valid,prices,price,minimum,parseBRL,split,quote};
if(typeof module==='object'&&module.exports)module.exports=api;else root.AdHubPricing=api;
})(typeof window!=='undefined'?window:globalThis);
