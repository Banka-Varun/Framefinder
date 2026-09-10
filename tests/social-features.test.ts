import assert from 'node:assert/strict';
import {GET,POST,DELETE} from '../app/api/v1/[...path]/route';
import {all,one,run,settings} from './platform';
import {containsContactDetails} from '../lib/message-policy';
import {validPushEndpoint} from '../server/notifications';
const base='https://framefinder.test';
async function call(path:string,method='GET',data?:unknown,cookie=''){const url=new URL(base+'/api/v1/'+path);return ({GET,POST,DELETE} as any)[method](new Request(url,{method,headers:{origin:base,cookie,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})}),{params:Promise.resolve({path:url.pathname.slice('/api/v1/'.length).split('/')})}) as Promise<Response>;}
async function account(username:string){const r=await call('auth/signup','POST',{name:username,username,email:username+'@example.com',password:'test account password phrase'});assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie')!.split(';')[0],user:(await r.json() as any)};}
const owner=await account('owner_test'),buyer=await account('buyer_test'),outsider=await account('outsider_test');
const ownerRow=(await one<any>('SELECT * FROM accounts WHERE username=?',['owner_test']))!,buyerRow=(await one<any>('SELECT * FROM accounts WHERE username=?',['buyer_test']))!,otherRow=(await one<any>('SELECT * FROM accounts WHERE username=?',['outsider_test']))!;
for(const q of ['OwN','own','OWN']){const res=await(await call('members?q='+q,'GET',undefined,buyer.cookie)).json() as any;assert.ok(res.members.some((m:any)=>m.username==='owner_test'));}
assert.equal((await call('members/OWNER_TEST/follow','POST',{following:true},buyer.cookie)).status,200);
await call('members/owner_test/follow','POST',{following:true},buyer.cookie);
const followers=await(await call('members/owner_test/followers','GET',undefined,buyer.cookie)).json() as any;assert.equal(followers.members[0].username,'buyer_test');
const following=await(await call('members/buyer_test/following','GET',undefined,buyer.cookie)).json() as any;assert.equal(following.members[0].username,'owner_test');
assert.equal((await one<any>('SELECT COUNT(*) n FROM notifications WHERE user_id=?',[ownerRow.id]))!.n,1);
await call('members/buyer_test/follow','POST',{following:true},outsider.cookie);
const mutual=await(await call('members/owner_test','GET',undefined,outsider.cookie)).json() as any;assert.equal(mutual.followedBy[0].username,'buyer_test');
console.log('PASS partial mixed-case search, follower lists, mutual connections and follow deduplication');
const tid=crypto.randomUUID(),proof=crypto.randomUUID();await run('INSERT INTO tickets(id,seller_id,movie,theater,show_at,language,format,quantity,face_value,price,proof_id,reference_hash,created_at,is_public) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)',[tid,ownerRow.id,'The Paradise','Test Cinema','2099-01-01T10:00:00Z','Telugu','2D',1,20000,18000,proof,crypto.randomUUID(),new Date().toISOString()]);
const thread=await(await call('conversations','POST',{ticketId:tid},buyer.cookie)).json() as any;assert.ok(thread.id);
const list=await(await call('conversations','GET',undefined,owner.cookie)).json() as any;assert.equal(list.conversations[0].unread,1);
for(const text of ['Call 9876543210','9 8 7 6 5 4 3 2 1 0','nine eight seven six five four three two one zero','pay varun@okaxis','varun (at) ybl','upi://pay?pa=test@ybl']){assert.equal(containsContactDetails(text),true,text);assert.equal((await call('conversations/'+thread.id+'/messages','POST',{message:text,nonce:crypto.randomUUID()},buyer.cookie)).status,422);}
assert.equal((await one<any>('SELECT COUNT(*) n FROM chat_messages'))!.n,0);
for(const text of ['Can you take 150?','Show at 10:30 on 2030-01-01','Hello @owner_test','Meet at cinema','2030-01-01 10:30'])assert.equal(containsContactDetails(text),false,text);
const nonce=crypto.randomUUID();await call('conversations/'+thread.id+'/messages','POST',{message:'Can you take 150?',nonce},buyer.cookie);await call('conversations/'+thread.id+'/messages','POST',{message:'Can you take 150?',nonce},buyer.cookie);
assert.equal((await one<any>('SELECT COUNT(*) n FROM chat_messages'))!.n,1);
const message=(await one<any>('SELECT * FROM chat_messages'))!;
assert.equal((await call('conversations/'+thread.id+'/messages/'+message.id,'DELETE',undefined,owner.cookie)).status,404);
assert.equal((await call('conversations/'+thread.id+'/messages/'+message.id,'DELETE',undefined,buyer.cookie)).status,200);
const offerNonce=crypto.randomUUID();const offer=await(await call('conversations/'+thread.id+'/offers','POST',{amount:15000,nonce:offerNonce},buyer.cookie)).json() as any;await call('conversations/'+thread.id+'/offers','POST',{amount:15000,nonce:offerNonce},buyer.cookie);
assert.equal((await one<any>('SELECT COUNT(*) n FROM ticket_offers'))!.n,1);
await call('conversations/'+thread.id+'/offers/'+offer.id,'POST',{action:'accept'},owner.cookie);
await call('notifications/read','POST',{conversationId:thread.id},owner.cookie);
const counts=await(await call('notifications/counts','GET',undefined,owner.cookie)).json() as any;assert.equal(counts.messages,0);
assert.equal((await call('conversations/'+thread.id,'GET',undefined,outsider.cookie)).status,404);
console.log('PASS contact rejection before persistence, message unsend ownership, request badge, offer retries and read tracking');
assert.equal((await call('admin','GET',undefined,owner.cookie)).status,403);
settings.ADMIN_USER_IDS=otherRow.id;
assert.equal((await call('admin','GET',undefined,outsider.cookie)).status,200);
assert.equal((await call('admin/review','POST',{ticketId:tid,decision:'approved',note:'Booking proof reviewed.'},outsider.cookie)).status,200);
assert.equal((await one<any>('SELECT status FROM tickets WHERE id=?',[tid]))!.status,'pending_verification');
assert.equal((await call('admin/notify','POST',{userId:ownerRow.id,title:'Review update',message:'Your proof has been reviewed.'},outsider.cookie)).status,200);
settings.ADMIN_USER_IDS=ownerRow.id;
assert.equal((await call('admin/review','POST',{ticketId:tid,decision:'approved',note:'Own listing review.'},owner.cookie)).status,403);
for(const u of ['http://127.0.0.1/x','https://evil.test/x','https://fcm.googleapis.com.evil.test/fcm/send/a','https://fcm.googleapis.com:444/fcm/send/a'])assert.equal(validPushEndpoint(u),false);
assert.equal(validPushEndpoint('https://fcm.googleapis.com/fcm/send/test'),true);
assert.equal((await call('notifications/push','POST',{endpoint:'https://evil.test',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}},buyer.cookie)).status,400);
console.log('PASS admin authorization, self-review denial, manual review separation and push endpoint validation');

const {default:webpush}=await import('web-push');
const pushKeys=webpush.generateVAPIDKeys();await run('INSERT INTO app_config(key,value) VALUES(?,?)',['webpush-vapid',JSON.stringify(pushKeys)]);
await run('INSERT INTO push_subscriptions(endpoint,user_id,payload,created_at) VALUES(?,?,?,?)',['https://fcm.googleapis.com/fcm/send/unit-test',ownerRow.id,JSON.stringify({endpoint:'https://fcm.googleapis.com/fcm/send/unit-test',keys:{p256dh:'test',auth:'test'}}),new Date().toISOString()]);
let deliveries=0;const originalSend=webpush.sendNotification;webpush.sendNotification=(async(_sub:any,payload:any)=>{deliveries++;assert.equal(JSON.parse(payload).body,'You have new activity. Open Framefinder to view it.');return {statusCode:201};}) as any;
const {notify}=await import('../server/notifications');await notify('push-unit-test',ownerRow.id,'Private message','Private text','/messages/example');await notify('push-unit-test',ownerRow.id,'Private message','Private text','/messages/example');assert.equal(deliveries,1);
webpush.sendNotification=(async()=>{throw {statusCode:410};}) as any;await notify('push-expired-test',ownerRow.id,'Test','Test','/notifications');assert.equal((await one<any>('SELECT COUNT(*) n FROM push_subscriptions'))!.n,0);webpush.sendNotification=originalSend;
console.log('PASS generic browser push payload, notification deduplication and expired subscription cleanup');
