import {z} from 'zod';
import {all,one,run,setting,getAsset} from '@/lib/platform';
import {user,ApiError,body,now,limit,cookie,hash,type Account} from './security';
import {notify} from './notifications';
export const isAdmin=(a:Account)=>setting('ADMIN_USER_IDS').split(',').map(s=>s.trim()).filter(Boolean).includes(a.id);
export async function admin(req:Request,path:string[]){const a=(await user(req))!;if(!isAdmin(a))throw new ApiError(403,'This account is not an administrator.');
 if(path[1]==='access'){
  const session=cookie(req,'ff_session'),key=hash('admin-access:'+session);
  if(req.method==='POST'){await run("INSERT OR REPLACE INTO auth_tokens(token,user_id,purpose,expires) SELECT ?,?,'admin-access',expires FROM sessions WHERE token=? AND user_id=? AND expires>?",[key,a.id,hash(session),a.id,now()]);return Response.json({verified:true});}
  if(req.method==='GET')return Response.json({verified:!!await one('SELECT token FROM auth_tokens WHERE token=? AND user_id=? AND purpose=? AND expires>?',[key,a.id,'admin-access',now()])});
  throw new ApiError(405,'Method not allowed');
 }
 if(req.method==='GET'&&path[1]==='proof'){const t=await one<any>('SELECT proof_id FROM tickets WHERE id=?',[path[2]]);if(!t)throw new ApiError(404,'Listing not found');const asset=await getAsset(t.proof_id);if(!asset)throw new ApiError(404,'Proof unavailable');return new Response(asset.body,{headers:{'Content-Type':asset.mime,'Cache-Control':'no-store'}});}
 if(req.method==='GET')return Response.json({tickets:await all("SELECT t.id,t.movie,t.theater,t.show_at,t.status,t.price,t.face_value,a.username,r.decision,r.note FROM tickets t JOIN accounts a ON a.id=t.seller_id LEFT JOIN admin_reviews r ON r.id=(SELECT id FROM admin_reviews WHERE ticket_id=t.id ORDER BY created_at DESC,id DESC LIMIT 1) WHERE t.status IN ('pending_verification','verified') ORDER BY t.created_at DESC LIMIT 100"),members:await all('SELECT id,username,name FROM accounts ORDER BY username LIMIT 500'),feedback:await all('SELECT f.*,a.username FROM member_feedback f JOIN accounts a ON a.id=f.user_id ORDER BY f.status,f.created_at DESC LIMIT 100')});
 if(req.method!=='POST')throw new ApiError(405,'Method not allowed');await limit('admin:'+a.id,30,60);
 if(path[1]==='feedback'){const p=z.object({id:z.string().uuid(),status:z.enum(['open','resolved'])}).parse(await body(req));const result=await run('UPDATE member_feedback SET status=? WHERE id=?',[p.status,p.id]);if(!result.changes)throw new ApiError(404,'Feedback not found');return Response.json({ok:true});}
 if(path[1]==='review'){const p=z.object({ticketId:z.string().uuid(),decision:z.enum(['approved','rejected','needs_info']),note:z.string().trim().min(5).max(1000)}).parse(await body(req));const t=await one<any>('SELECT * FROM tickets WHERE id=?',[p.ticketId]);if(!t)throw new ApiError(404,'Listing not found');if(t.seller_id===a.id)throw new ApiError(403,'Another administrator must review your own listing.');if(t.status!=='pending_verification')throw new ApiError(409,'Only pending listings can be reviewed.');const id=crypto.randomUUID();await run('INSERT INTO admin_reviews(id,ticket_id,admin_id,decision,note,created_at) VALUES(?,?,?,?,?,?)',[id,t.id,a.id,p.decision,p.note,now()]);if(p.decision==='rejected')await run("UPDATE tickets SET status='rejected',is_public=0 WHERE id=? AND status='pending_verification'",[t.id]);await notify('review:'+id,t.seller_id,'Ticket review: '+p.decision.replace('_',' '),p.note,'/tickets/'+t.id);return Response.json({ok:true});}
 if(path[1]==='notify'){const p=z.object({userId:z.string().min(1),title:z.string().trim().min(1).max(100),message:z.string().trim().min(1).max(1000)}).parse(await body(req));if(!await one('SELECT id FROM accounts WHERE id=?',[p.userId]))throw new ApiError(404,'Member not found');await notify('admin:'+crypto.randomUUID(),p.userId,p.title,p.message,'/notifications');return Response.json({ok:true});}
 throw new ApiError(404,'Not found');
}
