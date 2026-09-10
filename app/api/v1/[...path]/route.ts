import {seatAlerts,seatSnapshot} from '@/server/seat-alerts';
import {chat} from '@/server/chat';
import {auth} from '@/server/auth';
import {social} from '@/server/social';
import {commerce,webhook,ticketWebhook,bookingEvent} from '@/server/commerce';
import {ApiError,originCheck} from '@/server/security';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
async function handle(req:Request,ctx:{params:Promise<{path:string[]}>}){try{const {path}=await ctx.params;let result:Response;
 if(path[0]==='webhooks'){if(req.method!=='POST')throw new ApiError(405,'Method not allowed');if(path[1]==='razorpay')result=await webhook(req);else if(path[1]==='tickets')result=await ticketWebhook(req);else if(path[1]==='seats')result=await seatSnapshot(req);else if(path[1]==='booking')result=await bookingEvent(req);else throw new ApiError(404,'Not found');}
 else{originCheck(req);if(path[0]==='auth'){const read=['session','config','google','google-callback'].includes(path[1]);if(req.method!==(read?'GET':'POST'))throw new ApiError(405,'Method not allowed');result=await auth(req,path[1]);}else{const readOnly=['members','movies','state','recommendations','notifications'];if(['state','recommendations','notifications'].includes(path[0])&&req.method!=='GET')throw new ApiError(405,'Method not allowed');if(path[0]==='members'&&!path[2]&&req.method!=='GET')throw new ApiError(405,'Method not allowed');if(path[0]==='movies'&&(!path[1]||path[2]==='providers')&&req.method!=='GET')throw new ApiError(405,'Method not allowed');result=await (path[0]==='seat-alerts'?seatAlerts(req,path):path[0]==='conversations'?chat(req,path):['billing','alerts','tickets'].includes(path[0])?commerce(req,path):social(req,path));}}
 result.headers.set('Cache-Control','no-store');result.headers.set('X-Content-Type-Options','nosniff');return result;
 }catch(e){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});if(e instanceof ZodError)return Response.json({error:e.issues[0]?.message||'Check your details.'},{status:400});console.error('Request failed',e instanceof Error?e.name:'unknown');return Response.json({error:'The request could not be completed. Please try again.'},{status:500});}}
export const GET=handle;export const POST=handle;export const PUT=handle;export const DELETE=handle;
