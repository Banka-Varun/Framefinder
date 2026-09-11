import {randomInt} from 'node:crypto';
import {z} from 'zod';
import {all,one,run,batch,deleteAsset,setting} from '@/lib/platform';
import {ApiError,body,user,limit,passwordMatches,hash,now,sendMail,sessionCookie} from './security';
// Durable erasure retries are drained on session checks, including signed-out visits.
export async function drainAssetErasures(){try{const rows=await all<{asset_id:string}>('SELECT asset_id FROM asset_erasure_queue ORDER BY created_at LIMIT 5');await Promise.allSettled(rows.map(async row=>{await deleteAsset(row.asset_id);await run('DELETE FROM asset_erasure_queue WHERE asset_id=?',[row.asset_id]);}));}catch{console.error('Asset erasure retry deferred');}}
export async function accountLifecycle(req:Request,path:string[]){
 const a=(await user(req))!;
 if(req.method==='GET')return Response.json({hasPassword:!!a.password,emailConfirmationAvailable:!!setting('RESEND_API_KEY')&&!!setting('MAIL_FROM')});
 if(req.method!=='POST')throw new ApiError(405,'Method not allowed');await limit('account-lifecycle:'+a.id,6,900);
 if(path[1]==='confirmation-code'){
  const code=String(randomInt(100000,1000000));await run("DELETE FROM auth_tokens WHERE user_id=? AND purpose='account-action'",[a.id]);
  await run('INSERT INTO auth_tokens(token,user_id,purpose,expires) VALUES(?,?,?,?)',[hash(a.id+':account:'+code),a.id,'account-action',new Date(Date.now()+600000).toISOString()]);
  await sendMail(a.email,'Confirm your FrameFinder account change',`Your confirmation code is ${code}. It expires in 10 minutes. Use it only if you requested to deactivate or permanently delete your account.`);return Response.json({ok:true});
 }
 const p=z.object({action:z.enum(['deactivate','delete']),confirmUsername:z.string(),password:z.string().max(128).optional(),code:z.string().regex(/^\d{6}$/).optional()}).strict().parse(await body(req));
 if(p.confirmUsername!==a.username)throw new ApiError(400,'Type your exact username to confirm.');
 if(p.action==='delete'){if(a.password){if(!p.password||!await passwordMatches(p.password,a.password))throw new ApiError(401,'Enter your current password to confirm.');}
 else if(!p.code||!await one("SELECT token FROM auth_tokens WHERE token=? AND user_id=? AND purpose='account-action' AND expires>?",[hash(a.id+':account:'+p.code),a.id,now()]))throw new ApiError(401,'Enter the confirmation code sent to your email.');}
 const stamp=now();
 // This conditional tombstone is also the transaction guard for every erasure below.
 const gate="EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=? AND removed_by=? AND removed_at=?)";
 const args=[a.id,a.id,stamp];const statements:{sql:string;args:unknown[]}[]=[
  {sql:"INSERT OR IGNORE INTO removed_accounts(user_id,removed_by,removed_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM tickets WHERE (seller_id=? OR buyer_id=?) AND status IN ('verified','reserved'))",args:[...args,a.id,a.id]},
  {sql:`INSERT INTO account_lifecycle(user_id,state,updated_at) SELECT ?,?,? WHERE ${gate} ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at`,args:[a.id,p.action==='delete'?'deleted':'deactivated',stamp,...args]},
  ...['sessions','auth_tokens','push_subscriptions'].map(table=>({sql:`DELETE FROM ${table} WHERE user_id=? AND ${gate}`,args:[a.id,...args]})),
  {sql:`UPDATE tickets SET is_public=0 WHERE seller_id=? AND ${gate}`,args:[a.id,...args]},
 ];
 if(p.action==='delete')statements.push(
  {sql:`INSERT OR IGNORE INTO asset_erasure_queue(asset_id,created_at) SELECT id,? FROM assets WHERE user_id=? AND ${gate}`,args:[stamp,a.id,...args]},
  {sql:`DELETE FROM feedback_publication WHERE feedback_id IN (SELECT id FROM member_feedback WHERE user_id=?) AND ${gate}`,args:[a.id,...args]},
  ...['profiles','assets','social_state','member_feedback','member_subscriptions','member_preferences','taste_profiles','user_alerts','seat_alerts','seat_events'].map(table=>({sql:`DELETE FROM ${table} WHERE user_id=? AND ${gate}`,args:[a.id,...args]})),
  {sql:`DELETE FROM follows WHERE (follower=? OR following=?) AND ${gate}`,args:[a.id,a.id,...args]},
  {sql:`DELETE FROM notifications WHERE (user_id=? OR link=? OR link IN (SELECT '/messages/'||id FROM conversations WHERE buyer_id=? OR seller_id=?)) AND ${gate}`,args:[a.id,'/members/'+a.username,a.id,a.id,...args]},
  {sql:`DELETE FROM chat_messages WHERE sender_id=? AND ${gate}`,args:[a.id,...args]},
  {sql:`UPDATE tickets SET proof_id='' WHERE seller_id=? AND ${gate}`,args:[a.id,...args]},
  {sql:`UPDATE admin_reviews SET note='' WHERE (admin_id=? OR ticket_id IN (SELECT id FROM tickets WHERE seller_id=?)) AND ${gate}`,args:[a.id,a.id,...args]},
  {sql:`UPDATE accounts SET email=?,username=?,name='Deleted member',bio='',avatar='',languages='[]',password=NULL,google_id=NULL,verified=0 WHERE id=? AND ${gate}`,args:['deleted-'+a.id+'@deleted.invalid','deleted-'+a.id,a.id,...args]},
 );
 await batch(statements);
 if(!await one(`SELECT user_id FROM removed_accounts WHERE user_id=? AND removed_at=?`,[a.id,stamp]))throw new ApiError(409,'Resolve your active ticket exchanges before changing your account.');
 if(p.action==='delete')await drainAssetErasures();
 return Response.json({ok:true,next:p.action==='delete'?'/login?account=deleted':'/login?account=deactivated'},{headers:{'Set-Cookie':sessionCookie('',0)}});
}
