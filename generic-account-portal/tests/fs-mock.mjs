// Test-only transport. Never loaded by npm start or the Docker image.
import {appendFileSync} from 'node:fs';
const realFetch=globalThis.fetch; let state='active',posted=false,failOnce=true;
globalThis.fetch=async(url,opts={})=>{
 if(!String(url).startsWith('https://api.fastspring.com/'))return realFetch(url,opts);
 const u=new URL(url),method=opts.method||'GET';
 appendFileSync(process.env.MOCK_LOG,JSON.stringify({method,path:u.pathname,query:u.search,body:opts.body?JSON.parse(opts.body):null})+'\n');
 if(u.pathname==='/subscriptions'&&method==='POST'){
  if(process.env.MOCK_SCENARIO==='uncancel-unknown')throw Error('Connection interrupted');
  if(process.env.MOCK_SCENARIO==='uncancel-error')return Response.json({subscriptions:[{subscription:'test-sub',result:'error'}]});
  state='active';return Response.json({subscriptions:[{subscription:'test-sub',action:'subscription.update',result:'success'}]});
 }
 if(u.pathname.endsWith('/cancelSurvey/response')){if(process.env.MOCK_SCENARIO==='survey-failure'&&failOnce){failOnce=false;return Response.json({}, {status:500});}posted=true;return Response.json({reasonId:'1'});}
 if(u.pathname.includes('/cancelSurvey/reasons/'))return Response.json(state==='active'?{language:'en',reasons:[{id:'1',name:'cost',displayName:'Too expensive',enabled:true}]}:{language:'en',subscription:{subscriptionId:'test-sub'},cancelSurvey:{reasonId:'1',displayName:'Too expensive',feedbackText:'Test feedback',lang:'en'}});
 if(method==='DELETE'){if(!posted)throw Error('Survey was not saved');if(process.env.MOCK_SCENARIO==='cancel-unknown')throw Error('Connection interrupted');state=u.searchParams.get('billingPeriod')==='0'?'deactivated':'canceled';return Response.json({subscriptions:[{subscription:'test-sub',action:'cancel',result:process.env.MOCK_SCENARIO==='body-error'?'error':'success'}]});}
 return Response.json({id:'test-sub',account:process.env.MOCK_SCENARIO==='wrong-owner'?'other-account':'test-account',live:process.env.MOCK_SCENARIO==='live',state,autoRenew:state==='active',active:state!=='deactivated',display:'Test plan',priceDisplay:'£12.00',nextChargeDate:'2026-10-17'});
};
