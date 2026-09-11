import {z} from 'zod';
import {all,one,run} from '@/lib/platform';
import {user,body,ApiError,limit,now} from './security';
export async function subscriptions(req:Request){const a=(await user(req))!;
 if(req.method==='GET')return Response.json({subscription:await one('SELECT active,ticket_updates,community_updates,created_at,updated_at FROM member_subscriptions WHERE user_id=?',[a.id]),plan:{name:'FrameFinder Club',price:0,paymentsEnabled:false}});
 if(req.method!=='POST')throw new ApiError(405,'Method not allowed');await limit('subscription:'+a.id,20,60);
 const p=z.object({active:z.boolean(),ticketUpdates:z.boolean(),communityUpdates:z.boolean()}).strict().parse(await body(req));const stamp=now();await run('INSERT INTO member_subscriptions(user_id,active,ticket_updates,community_updates,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET active=excluded.active,ticket_updates=excluded.ticket_updates,community_updates=excluded.community_updates,updated_at=excluded.updated_at',[a.id,+p.active,+p.ticketUpdates,+p.communityUpdates,stamp,stamp]);return Response.json({ok:true});
}
export async function publicFeedback(req:Request,path:string[]){const a=(await user(req))!;
 if(req.method==='DELETE'&&path[1]){await run('UPDATE feedback_publication SET consent=0,published=0 WHERE feedback_id=? AND EXISTS(SELECT 1 FROM member_feedback WHERE id=feedback_id AND user_id=?)',[path[1],a.id]);return Response.json({ok:true});}
 if(req.method!=='GET')throw new ApiError(405,'Method not allowed');return Response.json({reviews:await all("SELECT f.id,f.message,f.rating,f.created_at,a.name,a.username,a.avatar FROM member_feedback f JOIN feedback_publication p ON p.feedback_id=f.id JOIN accounts a ON a.id=f.user_id WHERE f.kind='rating' AND f.rating>=4 AND p.consent=1 AND p.published=1 AND NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id) ORDER BY f.created_at DESC LIMIT 12"),own:await all("SELECT f.id,f.message,f.rating,p.consent,p.published FROM member_feedback f JOIN feedback_publication p ON p.feedback_id=f.id WHERE f.user_id=? AND p.consent=1 ORDER BY f.created_at DESC LIMIT 20",[a.id])});
}
export async function ticketSubscriberNotice(ticketId:string,proofId:string){
 await run(`INSERT OR IGNORE INTO notifications(id,user_id,title,message,link,created_at) SELECT 'ticket-approved:'||?||':'||a.id,a.id,'New ticket listing',t.movie||' · '||t.theater,'/tickets/'||t.id,? FROM tickets t JOIN member_subscriptions s ON s.active=1 AND s.ticket_updates=1 JOIN accounts a ON a.id=s.user_id WHERE t.id=? AND t.is_public=1 AND t.review_pending=0 AND t.show_at>? AND t.seller_id!=a.id AND NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id) AND EXISTS(SELECT 1 FROM json_each(a.languages) WHERE value=t.language) AND (SELECT decision FROM admin_reviews WHERE ticket_id=t.id AND proof_id=t.proof_id ORDER BY created_at DESC,id DESC LIMIT 1)='approved'`,[proofId,now(),ticketId,now()]);
}
