import {z} from 'zod';
import {all,one,batch} from '@/lib/platform';
import {ApiError,body,hash,now,limit} from './security';
import {pushNotification} from './notifications';
export async function recipientSearch(req:Request){const u=new URL(req.url),q=(u.searchParams.get('q')||'').trim().toLowerCase().slice(0,60),id=u.searchParams.get('id');return Response.json({members:await all('SELECT id,name,username,avatar FROM accounts a WHERE NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id) AND '+(id?'id=?':'(instr(lower(name),?)>0 OR instr(lower(username),?)>0)')+' ORDER BY name LIMIT 30',id?[id]:[q,q]),total:(await one<{n:number}>('SELECT COUNT(*) n FROM accounts a WHERE NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id)'))?.n||0});}
export async function sendAdminNotice(req:Request,actorId:string){
 await limit('admin-notice:'+actorId,10,60);
 const p=z.object({id:z.string().uuid().optional(),userId:z.string().uuid().optional(),userIds:z.array(z.string().uuid()).max(50).optional(),audience:z.enum(['selected','all','subscribers']).default('selected'),title:z.string().trim().min(1).max(100),message:z.string().trim().min(1).max(1000)}).strict().parse(await body(req));
 const ids=[...new Set(p.userId?[p.userId]:p.userIds||[])].sort();if(p.audience==='selected'&&!ids.length)throw new ApiError(400,'Choose at least one member.');if(p.audience!=='selected'&&ids.length)throw new ApiError(400,'Choose selected members or a group, not both.');
 const id=p.id||crypto.randomUUID(),payload=hash(JSON.stringify({actorId,ids,audience:p.audience,title:p.title,message:p.message}));const old=await one<any>('SELECT * FROM admin_broadcasts WHERE id=?',[id]);if(old){if(old.payload_hash!==payload)throw new ApiError(409,'This send reference is already in use.');return Response.json({ok:true,sent:old.sent_count});}
 const where=`NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id)`+(p.audience==='selected'?' AND a.id IN ('+ids.map(()=>'?').join(',')+')':p.audience==='subscribers'?' AND EXISTS(SELECT 1 FROM member_subscriptions WHERE user_id=a.id AND active=1 AND community_updates=1)':'');
 const recipientCount=(await one<{n:number}>('SELECT COUNT(*) n FROM accounts a WHERE '+where,p.audience==='selected'?ids:[]))?.n||0;if(!recipientCount)throw new ApiError(400,'No active members match this audience.');if(p.audience==='selected'&&recipientCount!==ids.length)throw new ApiError(400,'A selected member is no longer available.');
 const token=crypto.randomUUID(),prefix='admin:'+id+':',stamp=now();await batch([
 {sql:'INSERT OR IGNORE INTO admin_broadcasts(id,actor_id,payload_hash,dispatch_token,created_at) VALUES(?,?,?,?,?)',args:[id,actorId,payload,token,stamp]},
 {sql:`INSERT OR IGNORE INTO notifications(id,user_id,title,message,link,created_at) SELECT ?||a.id,a.id,?,?,?,? FROM accounts a WHERE ${where} AND EXISTS(SELECT 1 FROM admin_broadcasts WHERE id=? AND dispatch_token=?)`,args:[prefix,p.title,p.message,'/notifications',stamp,...(p.audience==='selected'?ids:[]),id,token]},
 {sql:'UPDATE admin_broadcasts SET sent_count=(SELECT COUNT(*) FROM notifications WHERE substr(id,1,?)=?) WHERE id=? AND dispatch_token=?',args:[prefix.length,prefix,id,token]},
 ]);
 const sent=await one<any>('SELECT * FROM admin_broadcasts WHERE id=?',[id]);if(sent.payload_hash!==payload)throw new ApiError(409,'This send reference is already in use.');
 if(sent.dispatch_token===token&&p.audience==='selected'&&ids.length===1)await pushNotification(ids[0],prefix+ids[0],{title:p.title,message:p.message,link:'/notifications'});
 return Response.json({ok:true,sent:sent.sent_count});
}
