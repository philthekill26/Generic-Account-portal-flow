import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {GET,POST,ADMIN,META} from '../dist/server/api.mjs';
const root=resolve(fileURLToPath(new URL('../dist/client/',import.meta.url)));
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{try{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
const secure=process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https';
const origin=process.env.PUBLIC_ORIGIN||`${secure?'https':'http'}://${req.headers.host}`;
const url=new URL(req.url,origin);
if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,mode:process.env.FS_MODE||'simulation'}));return;}
if(url.pathname==='/api/meta'){const response=await META();res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
if(url.pathname==='/api/portal'||url.pathname==='/api/admin'){
if(!['GET','POST'].includes(req.method)){res.writeHead(405,{'Allow':'GET, POST'});res.end();return;}
let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384){res.writeHead(413);res.end('Request too large');return;}}
let response;
try{response=await(url.pathname==='/api/admin'?ADMIN:req.method==='POST'?POST:GET)(new Request(url,{method:req.method,headers:req.headers,body:req.method==='POST'?body:undefined}));}catch{response=Response.json({error:'Request failed. Please retry.'},{status:500});}
res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
}
if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
const pathname=decodeURIComponent(url.pathname);const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
try{if(!(await stat(file)).isFile())throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}
}catch{if(!res.headersSent)res.writeHead(400);res.end('Bad request');}});
server.listen(port,host,()=>console.log(`Account portal running at http://${host}:${server.address().port} `));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
