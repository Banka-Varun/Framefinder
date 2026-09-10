import {isAdmin} from './admin';
import {z} from 'zod';
import {one,run,batch,setting} from '@/lib/platform';
import {ApiError,body,captcha,cookie,hash,limit,newSession,now,passwordHash,passwordMatches,publicAccount,sendMail,sessionCookie,token,user,type Account} from './security';
const username=z.string().trim().toLowerCase().min(3).max(24).regex(/^[a-z][a-z0-9_]+$/);
const email=z.string().email().max(200).transform(s=>s.toLowerCase().trim());
const password=z.string().min(10).max(128);
export async function auth(req:Request,path:string){
 if(path==='session'){const a=await user(req,false);return Response.json({user:a?{...publicAccount(a),email:a.email,verified:!!a.verified,admin:isAdmin(a)}:null});}
 if(path==='config')return Response.json({google:!!setting('GOOGLE_CLIENT_ID')&&!!setting('GOOGLE_CLIENT_SECRET'),captchaSiteKey:setting('TURNSTILE_SITE_KEY'),email:!!setting('RESEND_API_KEY'),captchaRequired:setting('REQUIRE_CAPTCHA')==='true'});
 if(path==='logout'){const t=cookie(req,'ff_session');if(t)await run('DELETE FROM sessions WHERE token=?',[hash(t)]);return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie('',0)}});}
 if(path==='google'){
  if(!setting('GOOGLE_CLIENT_ID')||!setting('GOOGLE_CLIENT_SECRET'))throw new ApiError(503,'Google sign-in is not configured yet. Use email and password.');
  const state=token(),verifier=token(),nonce=token();
  const challenge=Buffer.from(hash(verifier),'hex').toString('base64url');
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:setting('GOOGLE_CLIENT_ID'),redirect_uri:new URL('/api/v1/auth/google-callback',req.url).href,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}).toString();
  await run('INSERT INTO auth_tokens(token,user_id,purpose,expires) VALUES(?,?,?,?)',[hash(state),JSON.stringify({verifier,nonce}),'oauth',new Date(Date.now()+600000).toISOString()]);
  return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':`ff_oauth=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`}});
 }
 if(path==='google-callback'){
  const url=new URL(req.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';
  if(!state||state!==cookie(req,'ff_oauth')||!code)throw new ApiError(400,'Google sign-in was cancelled or expired.');
  const row=await one<{user_id:string}>('DELETE FROM auth_tokens WHERE token=? AND purpose=? AND expires>? RETURNING user_id',[hash(state),'oauth',now()]);if(!row)throw new ApiError(400,'Google sign-in expired.');
  const flow=JSON.parse(row.user_id);const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code,client_id:setting('GOOGLE_CLIENT_ID'),client_secret:setting('GOOGLE_CLIENT_SECRET'),redirect_uri:new URL('/api/v1/auth/google-callback',req.url).href,grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(10000)});
  const tokens=await response.json() as {access_token?:string;id_token?:string};if(!response.ok||!tokens.access_token||!tokens.id_token)throw new ApiError(400,'Google sign-in could not be completed.');
  // Google tokeninfo verifies the token issued over the authenticated token exchange.
  const vr=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(tokens.id_token),{signal:AbortSignal.timeout(10000)});const info=await vr.json() as Record<string,string>;
  if(!vr.ok||info.aud!==setting('GOOGLE_CLIENT_ID')||!['accounts.google.com','https://accounts.google.com'].includes(info.iss)||Number(info.exp)*1000<Date.now()||info.nonce!==flow.nonce||String(info.email_verified)!=='true')throw new ApiError(400,'Google identity could not be verified.');
  let a=await one<Account>('SELECT * FROM accounts WHERE google_id=?',[info.sub]);
  if(!a){if(await one('SELECT id FROM accounts WHERE email=?',[info.email.toLowerCase()]))throw new ApiError(409,'An email/password account already uses this email. Sign in with that account.');const id=crypto.randomUUID(),uname='film_'+id.replaceAll('-','').slice(0,12);await run('INSERT INTO accounts(id,email,username,name,google_id,verified,created_at) VALUES(?,?,?,?,?,1,?)',[id,info.email.toLowerCase(),uname,info.name||uname,info.sub,now()]);a=await one<Account>('SELECT * FROM accounts WHERE id=?',[id]);}
  const headers=new Headers({Location:'/onboarding'});headers.append('Set-Cookie',await newSession(a!.id));headers.append('Set-Cookie','ff_oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');return new Response(null,{status:302,headers});
 }
 const b=await body(req);const identity=String(b.email||b.identity||'').toLowerCase();await limit('auth:'+identity,12);await limit('auth-ip:'+(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown'),50);
 if(path==='signup'){
  const p=z.object({email,username,password,name:z.string().trim().min(1).max(60)}).parse(b);await captcha(req,b.captchaToken||'');
  if(await one('SELECT id FROM accounts WHERE email=? OR username=?',[p.email,p.username]))throw new ApiError(409,'That email or username is already registered.');
  const id=crypto.randomUUID();await run('INSERT INTO accounts(id,email,username,password,name,created_at) VALUES(?,?,?,?,?,?)',[id,p.email,p.username,passwordHash(p.password),p.name,now()]);
  return Response.json({ok:true,next:'/onboarding'},{headers:{'Set-Cookie':await newSession(id)}});
 }
 if(path==='login'){
  const p=z.object({identity:z.string().min(1).max(200),password:z.string().min(1).max(128)}).parse(b);await captcha(req,b.captchaToken||'');
  const a=await one<Account>('SELECT * FROM accounts WHERE email=? OR username=?',[p.identity.toLowerCase().trim(),p.identity.toLowerCase().trim()]);
  const dummy='00000000000000000000000000000000:'+('0'.repeat(128));const valid=passwordMatches(p.password,a?.password||dummy);
  if(!a||!a.password||!valid)throw new ApiError(401,'Incorrect email/username or password.');
  return Response.json({ok:true,next:a.onboarded?'/for-you':'/onboarding'},{headers:{'Set-Cookie':await newSession(a.id)}});
 }
 if(path==='forgot'){
  const e=email.parse(b.email);await captcha(req,b.captchaToken||'');if(!setting('RESEND_API_KEY'))throw new ApiError(503,'Password-reset email is not configured yet.');
  const a=await one<Account>('SELECT * FROM accounts WHERE email=?',[e]);if(a){const t=token();await run('INSERT INTO auth_tokens(token,user_id,purpose,expires) VALUES(?,?,?,?)',[hash(t),a.id,'reset',new Date(Date.now()+1800000).toISOString()]);await sendMail(e,'Reset your Framefinder password',`Reset your password: ${new URL('/reset-password?token='+t,req.url).href}\nThis link expires in 30 minutes. If you did not request this, ignore it.`);}
  return Response.json({message:'If that email is registered, a reset link has been sent.'});
 }
 if(path==='reset'){
  password.parse(b.password);const row=await one<{user_id:string}>('SELECT user_id FROM auth_tokens WHERE token=? AND purpose=? AND expires>?',[hash(String(b.token||'')),'reset',now()]);if(!row)throw new ApiError(400,'This reset link is invalid or expired.');
  const claimed=await run('DELETE FROM auth_tokens WHERE token=?',[hash(b.token)]);if(!claimed.changes)throw new ApiError(400,'This reset link has already been used.');await batch([{sql:'UPDATE accounts SET password=? WHERE id=?',args:[passwordHash(b.password),row.user_id]},{sql:'DELETE FROM sessions WHERE user_id=?',args:[row.user_id]}]);return Response.json({ok:true,next:'/login'});
 }
 if(path==='verify-email'){
  const a=(await user(req))!;const t=token();await run('INSERT INTO auth_tokens(token,user_id,purpose,expires) VALUES(?,?,?,?)',[hash(t),a.id,'verify',new Date(Date.now()+86400000).toISOString()]);await sendMail(a.email,'Verify your email',new URL('/verify-email?token='+t,req.url).href);return Response.json({message:'Verification email sent.'});
 }
 if(path==='confirm-email'){
  const row=await one<{user_id:string}>('DELETE FROM auth_tokens WHERE token=? AND purpose=? AND expires>? RETURNING user_id',[hash(String(b.token||'')),'verify',now()]);if(!row)throw new ApiError(400,'Verification link expired.');await run('UPDATE accounts SET verified=1 WHERE id=?',[row.user_id]);return Response.json({ok:true});
 }
 throw new ApiError(404,'Not found');
}
