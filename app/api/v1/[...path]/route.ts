import {feedback} from '@/server/feedback';
import {avatarResponse} from '@/server/avatar';
import {admin} from '@/server/admin';
import {seatAlerts,seatSnapshot} from '@/server/seat-alerts';
import {notifications} from '@/server/notifications';
import {posterResponse} from '@/server/posters';
import {chat} from '@/server/chat';
import {auth} from '@/server/auth';
import {social} from '@/server/social';
import {commerce,webhook,ticketWebhook,bookingEvent} from '@/server/commerce';
import {ApiError,originCheck} from '@/server/security';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
async function handle(req:Request,ctx:{params:Promise<{path:string[]}>}){try{const {path}=await ctx.params;let result:Response;
 if(path[0]==='webhooks'){if(req.method!=='POST')throw new ApiError(405,'Method not allowed');if(path[1]==='razorpay')result=await webhook(req);else if(path[1]==='tickets')result=await ticketWebhook(req);else if(path[1]==='seats')result=await seatSnapshot(req);else if(path[1]==='booking')result=await bookingEvent(req);else throw new ApiError(404,'Not found');}
 else{originCheck(req);if(path[0]==='auth'){const read=['session','config','google','google-callback','username'].includes(path[1]);if(req.method!==(read?'GET':'POST'))throw new ApiError(405,'Method not allowed');result=await auth(req,path[1]);}else{const readOnly=['members','movies','state','recommendations','notifications'];if(['state','recommendations'].includes(path[0])&&req.method!=='GET')throw new ApiError(405,'Method not allowed');if(path[0]==='members'&&!path[2]&&req.method!=='GET')throw new ApiError(405,'Method not allowed');if(path[0]==='movies'&&(!path[1]||path[2]==='providers')&&req.method!=='GET')throw new ApiError(405,'Method not allowed');result=await (path[0]==='feedback'?feedback(req):path[0]==='avatar'?avatarResponse(req):path[0]==='admin'?admin(req,path):path[0]==='notifications'?notifications(req,path):path[0]==='posters'?posterResponse(req):path[0]==='seat-alerts'?seatAlerts(req,path):path[0]==='conversations'?chat(req,path):['billing','alerts','tickets','my-tickets'].includes(path[0])?commerce(req,path):social(req,path));}}
 result.headers.set('Cache-Control',path[0]==='avatar'?'public, max-age=31536000, immutable':path[0]==='posters'?'public, max-age=3600':'no-store');result.headers.set('X-Content-Type-Options','nosniff');return result;
 }catch(e){if(new URL(req.url).pathname==='/api/v1/auth/google-callback'){const message=e instanceof ApiError?e.message:'Google sign-in could not be completed. Please try again.';return new Response(null,{status:302,headers:{Location:'/login?authError='+encodeURIComponent(message),'Cache-Control':'no-store'}});}if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store',...(e.retryAfter?{'Retry-After':String(e.retryAfter)}:{})}});if(e instanceof ZodError)return Response.json({error:e.issues[0]?.message||'Check your details.'},{status:400});console.error('Request failed',e instanceof Error?e.name:'unknown');return Response.json({error:'The request could not be completed. Please try again.'},{status:500});}}
export const GET=handle;export const POST=handle;export const PUT=handle;export const DELETE=handle;
