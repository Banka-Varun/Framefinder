import assert from 'node:assert/strict';
import {GET,POST,PUT} from '../app/api/v1/[...path]/route';
import {settings,one,run} from './platform';
import {hash} from '../server/security';
const base='https://framefinder.test';
async function call(path:string,method='GET',data?:unknown,cookie=''){const req=new Request(base+'/api/v1/'+path,{method,headers:{origin:base,cookie,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return ({GET,POST,PUT} as any)[method](req,{params:Promise.resolve({path:path.split('?')[0].split('/')})}) as Promise<Response>;}
const signup=await call('auth/signup','POST',{name:'Google Viewer',username:'google_viewer',email:'google-viewer@gmail.com',password:'existing account password'});
assert.equal(signup.status,200);const originalCookie=signup.headers.getSetCookie()[0].split(';')[0];
const original=await(await call('auth/session','GET',undefined,originalCookie)).json() as any;
await call('me','PUT',{name:'Google Viewer',bio:'My history',languages:['Telugu'],onboarded:true},originalCookie);
await call('movies/2','PUT',{watched:true,liked:true},originalCookie);
settings.GOOGLE_CLIENT_ID='test-client';settings.GOOGLE_CLIENT_SECRET='test-secret';
const nativeFetch=globalThis.fetch;let identity:any;
globalThis.fetch=async(input:any,init:any)=>{const u=String(input);if(u.startsWith('https://oauth2.googleapis.com/tokeninfo?'))return Response.json(identity);if(u==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-token',id_token:'test-id-token'});return nativeFetch(input,init);};
async function google(overrides:any={}){const start=await call('auth/google');const u=new URL(start.headers.get('location')!);identity={aud:'test-client',iss:'https://accounts.google.com',exp:String(Math.floor(Date.now()/1000)+3600),nonce:u.searchParams.get('nonce'),email_verified:'true',sub:'google-sub-viewer',email:'google-viewer@gmail.com',...overrides};return call('auth/google-callback?state='+u.searchParams.get('state')+'&code=test-code','GET',undefined,start.headers.getSetCookie()[0].split(';')[0]);}
const wrongNonce=await google({nonce:'wrong'});assert.match(wrongNonce.headers.get('location')!,/^\/login\?authError=/);assert.equal((await one<any>('SELECT google_id FROM accounts WHERE id=?',[original.user.id])).google_id,null);
const invalidExpiry=await google({exp:'invalid'});assert.match(invalidExpiry.headers.get('location')!,/^\/login\?authError=/);
const callback=await google();assert.equal(callback.status,302);assert.equal(callback.headers.get('location'),'/link-google');assert.ok(!callback.headers.getSetCookie().some(s=>s.startsWith('ff_session=')));
const pending=callback.headers.getSetCookie().find(s=>s.startsWith('ff_google_link='))!.split(';')[0];
assert.equal((await call('auth/link-google','POST',{password:'wrong'},pending)).status,401);
const linked=await call('auth/link-google','POST',{password:'existing account password'},pending);assert.equal(linked.status,200);assert.equal((await linked.json() as any).next,'/for-you');
assert.equal((await call('auth/link-google','POST',{password:'existing account password'},pending)).status,400);
const linkedCookie=linked.headers.getSetCookie().find(s=>s.startsWith('ff_session='))!.split(';')[0];
const session=await(await call('auth/session','GET',undefined,linkedCookie)).json() as any;assert.equal(session.user.id,original.user.id);assert.equal(session.user.username,'google_viewer');assert.deepEqual(session.user.languages,['Telugu']);assert.equal(session.user.verified,true);
assert.equal((await one<any>('SELECT COUNT(*) n FROM accounts WHERE email=?',['google-viewer@gmail.com'])).n,1);
assert.equal((await one<any>('SELECT liked FROM social_state WHERE user_id=? AND movie_id=?',[original.user.id,2])).liked,1);
const repeat=await google();assert.equal(repeat.headers.get('location'),'/for-you');assert.ok(repeat.headers.getSetCookie().some(s=>s.startsWith('ff_session=')));
assert.equal((await call('auth/login','POST',{identity:'google_viewer',password:'existing account password'})).status,200);
const conflict=await google({sub:'different-google-sub'});assert.match(conflict.headers.get('location')!,/^\/login\?authError=/);
assert.equal((await one<any>('SELECT google_id FROM accounts WHERE id=?',[original.user.id])).google_id,'google-sub-viewer');
const fresh=await google({email:'new-google@gmail.com',sub:'new-google-sub'});assert.equal(fresh.headers.get('location'),'/onboarding');
// Expired pending proofs cannot link another account.
await run('INSERT INTO auth_tokens(token,user_id,purpose,expires) VALUES(?,?,?,?)',[hash('expired-link'),JSON.stringify({accountId:original.user.id,email:'google-viewer@gmail.com',sub:'google-sub-viewer'}),'google-link','2000-01-01T00:00:00Z']);
assert.equal((await call('auth/link-google','POST',{password:'existing account password'},'ff_google_link=expired-link')).status,400);
globalThis.fetch=nativeFetch;
console.log('PASS Google linking: password confirmation, stable account and diary, repeat sign-in, invalid identity, expiry and replay');
