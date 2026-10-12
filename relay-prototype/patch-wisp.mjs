import {readFileSync,writeFileSync} from 'node:fs';
// wisp-js 0.5.0 stores streams in an object, but its per-host limiter iterates it as an array.
const p=new URL('./node_modules/@mercuryworkshop/wisp-js/src/server/filter.mjs',import.meta.url);
const old='for (let stream of connection.streams)',fixed='for (let stream of Object.values(connection.streams))';
let source=readFileSync(p,'utf8');if(source.includes(old)){writeFileSync(p,source.replace(old,fixed));console.log('Applied wisp-js 0.5.0 per-host limiter fix.');}else if(!source.includes(fixed))throw Error('Unexpected wisp-js source; review patch.');
source=readFileSync(p,'utf8').replace('let ip = ipaddr.parse(ip_str);','let ip = ipaddr.process(ip_str);').replace('"carrierGradeNat", "private", "reserved"','"carrierGradeNat", "private", "reserved", "uniqueLocal", "multicast"');
writeFileSync(p,source);
