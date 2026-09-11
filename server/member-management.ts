import {z} from 'zod';
import {all,one,batch,run,setting} from '@/lib/platform';
import {ApiError,body,now,limit} from './security';
export async function manageMembers(req:Request,actorId:string){
 const protectedIds=setting('ADMIN_USER_IDS').split(',').map(value=>value.trim()).filter(Boolean);
 if(req.method==='GET'){const q=(new URL(req.url).searchParams.get('q')||'').trim().toLowerCase().slice(0,60);const members=await all<any>("SELECT a.id,a.name,a.username,a.email,a.avatar,r.removed_at FROM accounts a LEFT JOIN removed_accounts r ON r.user_id=a.id WHERE instr(lower(a.username),?)>0 OR instr(lower(a.name),?)>0 OR instr(lower(a.email),?)>0 ORDER BY a.created_at DESC LIMIT 50",Array(3).fill(q));return Response.json({members:members.map(member=>({...member,protected:member.id===actorId||protectedIds.includes(member.id)}))});}
 if(req.method!=='POST')throw new ApiError(405,'Method not allowed');await limit('manage-members:'+actorId,20,60);
 const p=z.object({userId:z.string().uuid(),action:z.enum(['remove','restore']),confirmUsername:z.string().min(1).max(30)}).strict().parse(await body(req));
 const member=await one<any>('SELECT id,username FROM accounts WHERE id=?',[p.userId]);if(!member)throw new ApiError(404,'Member not found');if(member.id===actorId||protectedIds.includes(member.id))throw new ApiError(403,'Owner and administrator accounts cannot be removed here.');if(p.confirmUsername!==member.username)throw new ApiError(400,'Type the exact username to confirm the selected member.');
 if(p.action==='restore'){await run('DELETE FROM removed_accounts WHERE user_id=?',[member.id]);return Response.json({ok:true,removed:false});}
 const stamp=now();await batch([
  {sql:"INSERT OR IGNORE INTO removed_accounts(user_id,removed_by,removed_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM tickets WHERE (seller_id=? OR buyer_id=?) AND status IN ('verified','reserved'))",args:[member.id,actorId,stamp,member.id,member.id]},
  {sql:'DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=?)',args:[member.id,member.id]},
  {sql:'DELETE FROM auth_tokens WHERE user_id=? AND EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=?)',args:[member.id,member.id]},
  {sql:'DELETE FROM push_subscriptions WHERE user_id=? AND EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=?)',args:[member.id,member.id]},
  {sql:'UPDATE tickets SET is_public=0 WHERE seller_id=? AND EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=?)',args:[member.id,member.id]},
 ]);
 if(!await one('SELECT user_id FROM removed_accounts WHERE user_id=?',[member.id]))throw new ApiError(409,'Resolve active ticket exchanges before removing this member.');return Response.json({ok:true,removed:true});
}
