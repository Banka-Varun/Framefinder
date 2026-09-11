import {billingPeriods} from '@/lib/subscription-plans';
import {z} from 'zod';
import {all,one,run,batch} from '@/lib/platform';
import {user,body,ApiError,limit,now} from './security';
export async function subscriptions(req:Request){const a=(await user(req))!;
 if(req.method==='GET')return Response.json({subscription:await one('SELECT active,ticket_updates,community_updates,created_at,updated_at FROM member_subscriptions WHERE user_id=?',[a.id]),preferences:await one('SELECT selected_plan,billing_period FROM member_preferences WHERE user_id=?',[a.id]),plan:{name:'FrameFinder Club',price:0,paymentsEnabled:false}});
 if(req.method!=='POST')throw new ApiError(405,'Method not allowed');await limit('subscription:'+a.id,20,60);
 const p=z.object({active:z.boolean(),ticketUpdates:z.boolean(),communityUpdates:z.boolean(),selectedPlan:z.enum(['free','plus','unlimited','pro-max']).optional(),billingPeriod:z.enum(billingPeriods).optional()}).strict().parse(await body(req));const stamp=now();await batch([{sql:'INSERT INTO member_subscriptions(user_id,active,ticket_updates,community_updates,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET active=excluded.active,ticket_updates=excluded.ticket_updates,community_updates=excluded.community_updates,updated_at=excluded.updated_at',args:[a.id,+p.active,+p.ticketUpdates,+p.communityUpdates,stamp,stamp]},...(p.selectedPlan?[{sql:'INSERT INTO member_preferences(user_id,selected_plan,billing_period) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET selected_plan=excluded.selected_plan,billing_period=excluded.billing_period',args:[a.id,p.selectedPlan,p.billingPeriod||'quarterly']}]:[])]);return Response.json({ok:true});
}
export async function publicFeedback(req:Request,path:string[]){const a=(await user(req))!;
 if(req.method==='DELETE'&&path[1]){await run('UPDATE feedback_publication SET consent=0,published=0 WHERE feedback_id=? AND EXISTS(SELECT 1 FROM member_feedback WHERE id=feedback_id AND user_id=?)',[path[1],a.id]);return Response.json({ok:true});}
 if(req.method==='POST'&&path[1]){const f=await one<{rating:number}>("SELECT rating FROM member_feedback WHERE id=? AND user_id=? AND kind='rating'",[path[1],a.id]);if(!f)throw new ApiError(404,'Rating not found');await run('INSERT INTO feedback_publication(feedback_id,consent,published) VALUES(?,1,0) ON CONFLICT(feedback_id) DO UPDATE SET consent=1',[path[1]]);return Response.json({ok:true});}
 if(req.method!=='GET')throw new ApiError(405,'Method not allowed');
 const page=Math.max(1,Math.min(10000,Math.floor(Number(new URL(req.url).searchParams.get('page'))||1)));
 const reviews=await all("SELECT f.id,f.message,f.rating,f.created_at,a.name,a.username,a.avatar FROM member_feedback f JOIN feedback_publication p ON p.feedback_id=f.id JOIN accounts a ON a.id=f.user_id WHERE f.kind='rating' AND p.consent=1 AND p.published=1 AND NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id) ORDER BY f.created_at DESC,f.id DESC LIMIT 13 OFFSET ?",[(page-1)*12]);
 return Response.json({reviews:reviews.slice(0,12),hasMore:reviews.length>12,page,own:await all("SELECT f.id,f.message,f.rating,COALESCE(p.consent,0) consent,COALESCE(p.published,0) published FROM member_feedback f LEFT JOIN feedback_publication p ON p.feedback_id=f.id WHERE f.user_id=? AND f.kind='rating' ORDER BY f.created_at DESC LIMIT 20",[a.id])});

}
export async function ticketSubscriberNotice(ticketId:string,proofId:string){
 await run(`INSERT OR IGNORE INTO notifications(id,user_id,title,message,link,created_at) SELECT 'ticket-approved:'||?||':'||a.id,a.id,'New ticket listing',t.movie||' · '||t.theater,'/tickets/'||t.id,? FROM tickets t JOIN member_subscriptions s ON s.active=1 AND s.ticket_updates=1 JOIN accounts a ON a.id=s.user_id WHERE t.id=? AND t.is_public=1 AND t.review_pending=0 AND t.show_at>? AND t.seller_id!=a.id AND NOT EXISTS(SELECT 1 FROM removed_accounts WHERE user_id=a.id) AND EXISTS(SELECT 1 FROM json_each(a.languages) WHERE value=t.language) AND (SELECT decision FROM admin_reviews WHERE ticket_id=t.id AND proof_id=t.proof_id ORDER BY created_at DESC,id DESC LIMIT 1)='approved'`,[proofId,now(),ticketId,now()]);
}
