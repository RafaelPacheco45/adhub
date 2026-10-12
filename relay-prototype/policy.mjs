export const hosts=[/^publicsuffix\.org$/i,/^(www|m|consent)\.youtube\.com$/i,/^youtube\.com$/i,/(^|\.)youtube-nocookie\.com$/i,/(^|\.)googlevideo\.com$/i,/(^|\.)ytimg\.com$/i,/(^|\.)ggpht\.com$/i,/(^|\.)gstatic\.com$/i,/(^|\.)googleapis\.com$/i,/(^|\.)googleusercontent\.com$/i,/(^|\.)doubleclick\.net$/i,/(^|\.)googlesyndication\.com$/i,/^(www|consent)\.google\.com$/i];
export const allowedHost=host=>hosts.some(rule=>rule.test(host));
export function validUpgrade(req,port){return req.url==='/wisp/'&&req.headers.origin===`http://127.0.0.1:${port}`&&req.headers.host===`127.0.0.1:${port}`;}
