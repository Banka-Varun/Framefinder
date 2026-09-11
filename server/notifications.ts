import {visiblePicture} from '@/lib/profile-pictures';
import webpush from 'web-push';
import {z} from 'zod';
import {all,one,run} from '@/lib/platform';
import {ApiError,user,body,now,hash,limit} from './security';
type Keys={publicKey:string;privateKey:string};
async function keys():Promise<Keys|null>{const row=await one<{value:string}>('SELECT value FROM app_config WHERE key=?',['webpush-vapid']);return row?JSON.parse(row.value):null;}
export function validPushEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&((u.hostname==='fcm.googleapis.com'&&/^\/(fcm\/send|wp)\//.test(u.pathname))||(u.hostname==='updates.push.services.mozilla.com'&&u.pathname.startsWith('/wpush/'))||(u.hostname==='web.push.apple.com'&&u.pathname.startsWith('/')));}catch{return false;}}
export async function pushNotification(userId:string,id:string,event:{title:string;message:string;link:string}){
 try{const k=await keys();if(!k)return;const subscriptions=await all<{endpoint:string;payload:string}>('SELECT endpoint,payload FROM push_subscriptions WHERE user_id=?',[userId]);
 await Promise.allSettled(subscriptions.filter(s=>validPushEndpoint(s.endpoint)).map(async s=>{try{await webpush.sendNotification(JSON.parse(s.payload),JSON.stringify({title:Array.from(event.title).slice(0,120).join(''),body:Array.from(event.message).slice(0,500).join(''),url:event.link.startsWith('/')&&!event.link.startsWith('//')?event.link:'/notifications',tag:id}),{vapidDetails:{subject:'https://framefinderr.vercel.app',publicKey:k.publicKey,privateKey:k.privateKey},TTL:3600,timeout:4000});}catch(e){const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410)await run('DELETE FROM push_subscriptions WHERE endpoint=?',[s.endpoint]);else console.error('Push delivery failed',status||'network');}}));
 }catch{console.error('Push delivery unavailable');}
}
export async function notify(id:string,userId:string,title:string,message:string,link:string){
 try{if(await one('SELECT user_id FROM removed_accounts WHERE user_id=?',[userId]))return;const result=await run('INSERT OR IGNORE INTO notifications(id,user_id,title,message,link,created_at) VALUES(?,?,?,?,?,?)',[id,userId,title,message,link,now()]);if(result.changes)await pushNotification(userId,id,{title,message,link});}catch{console.error('Notification delivery unavailable');}
}
export async function notifications(req:Request,path:string[]){const a=(await user(req))!;
 if(path[1]==='setup'){if(req.method==='GET')return Response.json({prompted:!!(await one<{notification_prompted:number}>('SELECT notification_prompted FROM member_preferences WHERE user_id=?',[a.id]))?.notification_prompted});if(req.method!=='POST')throw new ApiError(405,'Method not allowed');await run('INSERT INTO member_preferences(user_id,notification_prompted) VALUES(?,1) ON CONFLICT(user_id) DO UPDATE SET notification_prompted=1',[a.id]);return Response.json({ok:true});}
 if(path[1]==='push'){
  if(req.method==='GET'){const k=await keys();return Response.json({publicKey:k?.publicKey||null});}
  if(req.method==='POST'){await limit('push:'+a.id,20);const p=z.object({endpoint:z.string().max(2048),keys:z.object({p256dh:z.string().regex(/^[\w-]+$/).min(80).max(100),auth:z.string().regex(/^[\w-]+$/).min(20).max(30)})}).parse(await body(req));if(!validPushEndpoint(p.endpoint))throw new ApiError(400,'This browser push provider is not supported. Use Chrome on Android.');const count=await one<{n:number}>('SELECT COUNT(*) n FROM push_subscriptions WHERE user_id=?',[a.id]);if((count?.n||0)>=10&&!await one('SELECT endpoint FROM push_subscriptions WHERE endpoint=? AND user_id=?',[p.endpoint,a.id]))throw new ApiError(400,'Remove a registered device before adding another.');await run('INSERT INTO push_subscriptions(endpoint,user_id,payload,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,payload=excluded.payload',[p.endpoint,a.id,JSON.stringify(p),now()]);return Response.json({ok:true});}
  if(req.method==='DELETE'){const p=z.object({endpoint:z.string()}).parse(await body(req));await run('DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?',[p.endpoint,a.id]);return Response.json({ok:true});}
 }
 if(path[1]==='read'&&req.method==='POST'){const p=z.object({id:z.string().optional(),conversationId:z.string().optional()}).parse(await body(req));if(p.conversationId)await run('UPDATE notifications SET read=1 WHERE user_id=? AND link=?',[a.id,'/messages/'+p.conversationId]);else if(p.id)await run('UPDATE notifications SET read=1 WHERE user_id=? AND id=?',[a.id,p.id]);else await run('UPDATE notifications SET read=1 WHERE user_id=?',[a.id]);return Response.json({ok:true});}
 if(req.method!=='GET')throw new ApiError(405,'Method not allowed');
 const counts=await one('SELECT COUNT(*) unread,COUNT(CASE WHEN link LIKE \'/messages/%\' THEN 1 END) messages FROM notifications WHERE user_id=? AND read=0',[a.id]);
 if(path[1]==='counts')return Response.json(counts);
 const rows=await all<any>(`SELECT n.*,sender.name sender_name,sender.username sender_username,sender.avatar sender_avatar FROM notifications n LEFT JOIN conversations c ON n.link='/messages/'||c.id AND (c.buyer_id=n.user_id OR c.seller_id=n.user_id) LEFT JOIN accounts sender ON (sender.id=CASE WHEN c.buyer_id=n.user_id THEN c.seller_id ELSE c.buyer_id END OR n.link='/members/'||sender.username) AND NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=sender.id) WHERE n.user_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT 100`,[a.id]);
 return Response.json({notifications:rows.map(n=>({...n,sender_avatar:n.id.startsWith('admin:')||n.id.startsWith('review:')?'/profile-pictures/admin-notification.png':visiblePicture(n.sender_avatar||''),sender_name:n.id.startsWith('admin:')||n.id.startsWith('review:')?'FrameFinder team':n.sender_name||'FrameFinder'})),...counts as object});
}
