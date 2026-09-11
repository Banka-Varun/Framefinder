import assert from 'node:assert/strict';
import {catalog,hasPoster} from '../server/catalog';
import {GET,POST,PUT,DELETE} from '../app/api/v1/[...path]/route';
import {run,one,all,settings} from './platform';
import {firstFilmPictures,pictureCatalog,pictureCollections} from '../lib/profile-pictures';
const base='https://framefinder.test';
async function call(path:string,method='GET',data?:unknown,cookie=''){const r=await ({GET,POST,PUT,DELETE} as any)[method](new Request(base+'/api/v1/'+path,{method,headers:{origin:base,cookie,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})}),{params:Promise.resolve({path:path.split('?')[0].split('/')})});return r as Response;}
async function account(username:string){const r=await call('auth/signup','POST',{name:username,username,email:username+'@example.com',password:'workspace update test password'});assert.equal(r.status,200);return {cookie:r.headers.getSetCookie()[0].split(';')[0],...await one<any>('SELECT id FROM accounts WHERE username=?',[username])};}
const admin=await account('workspace_admin'),seller=await account('workspace_seller'),reader=await account('workspace_reader'),removed=await account('workspace_removed');settings.ADMIN_USER_IDS=admin.id;
assert.equal((await(await call('admin/access','GET',undefined,admin.cookie)).json()).verified,true);assert.equal((await call('admin/access','GET',undefined,reader.cookie)).status,403);
assert.equal((await call('home','GET')).status,401);
await call('movies/2','PUT',{rating:8,watched:true,review:'My own film diary.'},reader.cookie);
await call('movies/3','PUT',{rating:9,review:'A memorable film.',spoiler:true},seller.cookie);
await call('movies/4','PUT',{watched:true,watchedOn:'2026-08-10'},seller.cookie);
await call('movies/5','PUT',{rating:7},seller.cookie);
await run('UPDATE social_state SET updated_at=? WHERE user_id=? AND movie_id=?',['2026-09-01T12:00:00Z',seller.id,3]);
await run('UPDATE social_state SET updated_at=? WHERE user_id=? AND movie_id=?',['2026-09-02T12:00:00Z',seller.id,5]);
await call('movies/6','PUT',{rating:10},admin.cookie);
await call('members/workspace_reader/follow','POST',{following:true},admin.cookie);
assert.equal((await(await call('home','GET',undefined,reader.cookie)).json()).activity.length,0,'Own ratings and follower-only activity are excluded');
await call('members/workspace_seller/follow','POST',{following:true},reader.cookie);
for(const endpoint of ['home','feed']){
 const home=await(await call(endpoint,'GET',undefined,reader.cookie)).json();
 assert.deepEqual(home.activity.map((row:any)=>row.movie_id),[5,3]);
 assert.ok(home.activity.every((row:any)=>row.username==='workspace_seller'));
 assert.equal(home.activity[1].rating,9);assert.equal(home.activity[1].review,'A memorable film.');assert.equal(home.activity[1].spoiler,1);
}
for(const viewer of [reader,seller]){
 const profile=await(await call('members/workspace_seller','GET',undefined,viewer.cookie)).json();
 assert.equal(profile.state.find((row:any)=>row.movie_id===5).rating,7,'Rating-only entries are public');
 assert.equal(profile.state.find((row:any)=>row.movie_id===3).review,'A memorable film.');
 assert.equal(profile.state.find((row:any)=>row.movie_id===4).rating,null,'Watched films do not invent a rating');
 assert.equal(profile.state.find((row:any)=>row.movie_id===4).watched_on,'2026-08-10');
 assert.ok(profile.movies.some((movie:any)=>movie.id===5));
}
const ownProfile=await(await call('members/workspace_reader','GET',undefined,seller.cookie)).json();assert.equal(ownProfile.state.find((row:any)=>row.movie_id===2).rating,8);
await call('members/workspace_seller/follow','POST',{following:false},reader.cookie);
assert.equal((await(await call('home','GET',undefined,reader.cookie)).json()).activity.length,0);
const picks=await(await call('recommendations?languages=Telugu,English','GET',undefined,reader.cookie)).json();
assert.ok(picks.movies.some((movie:any)=>movie.language==='Telugu'));assert.ok(picks.movies.some((movie:any)=>movie.language==='English'));
assert.ok(picks.movies.every((movie:any)=>['Telugu','English'].includes(movie.language)&&movie.id!==2));
const outsideShelf=catalog.find(movie=>hasPoster(movie)&&['Telugu','English'].includes(movie.language)&&!picks.movies.some((pick:any)=>pick.id===movie.id)&&movie.id!==2)!;assert.ok(outsideShelf);
const searched=await(await call('recommendations?languages=Telugu,English&q='+encodeURIComponent(outsideShelf.title),'GET',undefined,reader.cookie)).json();assert.ok(searched.movies.some((movie:any)=>movie.id===outsideShelf.id),'Search finds films outside the recommendation shelf');
const ownFilm=catalog.find(movie=>movie.id===2)!;
const watchedSearch=await(await call('recommendations?languages=&q='+encodeURIComponent(ownFilm.title),'GET',undefined,reader.cookie)).json();assert.ok(watchedSearch.movies.some((movie:any)=>movie.id===2),'Search includes already rated films');
const english=await(await call('recommendations?languages=English','GET',undefined,reader.cookie)).json();assert.ok(english.movies.length);assert.ok(english.movies.every((movie:any)=>movie.language==='English'));
assert.equal((await call('recommendations?languages=Unknown','GET',undefined,reader.cookie)).status,400);
assert.equal((await(await call('recommendations?languages=&q=zzzz-no-such-movie-zzzz','GET',undefined,reader.cookie)).json()).movies.length,0);

assert.ok(pictureCollections.cartoons.includes('m6.jpg'));assert.ok(pictureCollections.animation.length>10);assert.equal(pictureCatalog.length,45);
assert.equal(firstFilmPictures({title:'Hi Nanna',language:'Telugu',genres:['Drama']})[0].file,'nani-portrait.jpg');assert.ok(firstFilmPictures({title:'Salaar',language:'Telugu',genres:['Action']}).every(p=>['prabhas-portrait.jpg','chatrapathi-portrait.jpg'].includes(p.file)));
await call('me','PUT',{name:'Reader',bio:'',languages:['Telugu'],firstMovieId:2},reader.cookie);assert.equal((await one<any>('SELECT first_movie_id FROM taste_profiles WHERE user_id=?',[reader.id])).first_movie_id,2);
const sub={active:true,ticketUpdates:true,communityUpdates:true};assert.equal((await call('subscriptions','POST',sub)).status,401);assert.equal((await call('subscriptions','POST',{...sub,userId:seller.id},reader.cookie)).status,400);assert.equal((await call('subscriptions','POST',sub,reader.cookie)).status,200);assert.equal((await(await call('subscriptions','GET',undefined,reader.cookie)).json()).subscription.active,1);
const tid=crypto.randomUUID(),proof=crypto.randomUUID();await run('INSERT INTO tickets(id,seller_id,movie,theater,show_at,language,format,quantity,face_value,price,proof_id,reference_hash,created_at,is_public) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)',[tid,seller.id,'Hi Nanna','Cinema','2099-01-01T12:00:00Z','Telugu','2D',1,20000,18000,proof,'workspace-proof',new Date().toISOString()]);
assert.equal((await(await call('tickets','GET',undefined,reader.cookie)).json()).tickets.length,0);assert.equal((await call('tickets/'+tid,'GET',undefined,reader.cookie)).status,404);assert.equal((await call('conversations','POST',{ticketId:tid},reader.cookie)).status,404);assert.equal((await call('tickets/'+tid,'GET',undefined,seller.cookie)).status,200);
assert.equal((await call('admin/review','POST',{ticketId:tid,proofId:proof,decision:'approved',note:'The proof is complete.'},admin.cookie)).status,200);
assert.equal((await(await call('tickets','GET',undefined,reader.cookie)).json()).tickets.length,1);assert.equal((await(await call('tickets/'+tid,'GET',undefined,reader.cookie)).json()).review,null);assert.ok(await one('SELECT id FROM notifications WHERE user_id=? AND link=?',[reader.id,'/tickets/'+tid]));
assert.equal((await call('subscriptions','POST',{...sub,active:false},reader.cookie)).status,200);assert.equal((await(await call('subscriptions','GET',undefined,reader.cookie)).json()).subscription.active,0);
await call('movies/7','PUT',{rating:10},removed.cookie);await call('members/workspace_removed/follow','POST',{following:true},reader.cookie);
await run('INSERT INTO removed_accounts(user_id,removed_by,removed_at) VALUES(?,?,?)',[removed.id,admin.id,new Date().toISOString()]);
assert.equal((await(await call('home','GET',undefined,reader.cookie)).json()).activity.length,0,'Removed members are excluded');
assert.equal((await call('members/workspace_removed','GET',undefined,reader.cookie)).status,404);
const notice={id:crypto.randomUUID(),audience:'all',title:'A test notice',message:'A test notice for all active members.'};assert.equal((await call('admin/notify','POST',notice,reader.cookie)).status,403);const sends=await Promise.all([call('admin/notify','POST',notice,admin.cookie),call('admin/notify','POST',notice,admin.cookie)]);assert.ok(sends.every(r=>r.status===200));assert.equal((await one<any>("SELECT COUNT(*) n FROM notifications WHERE title='A test notice'")).n,3);assert.equal((await call('admin/notify','POST',{...notice,message:'Different payload'},admin.cookie)).status,409);
await account('workspace_newcomer');await call('admin/notify','POST',notice,admin.cookie);assert.equal((await one<any>("SELECT COUNT(*) n FROM notifications WHERE title='A test notice'")).n,3);
const selected={id:crypto.randomUUID(),audience:'selected',userIds:[reader.id],title:'Selected',message:'Only the selected member.'};assert.equal((await call('admin/notify','POST',selected,admin.cookie)).status,200);assert.equal((await one<any>("SELECT COUNT(*) n FROM notifications WHERE title='Selected'")).n,1);
assert.equal((await call('admin/notify','POST',{id:crypto.randomUUID(),audience:'subscribers',title:'Subscribed',message:'For subscribers'},admin.cookie)).status,400);
const recipientResult=await(await call('admin/recipients?q=workspace_reader','GET',undefined,admin.cookie)).json();assert.equal(recipientResult.members[0].id,reader.id);assert.equal((await call('admin/recipients','GET',undefined,reader.cookie)).status,403);
const rating={id:crypto.randomUUID(),kind:'rating',category:'feedback',rating:4,message:'The new booking navigation is useful.',publicConsent:true};assert.equal((await call('feedback','POST',rating,reader.cookie)).status,200);assert.equal((await(await call('community-reviews','GET',undefined,reader.cookie)).json()).reviews.length,0);
assert.equal((await call('admin/publish-feedback','POST',{id:rating.id,publish:true},reader.cookie)).status,403);assert.equal((await call('admin/publish-feedback','POST',{id:rating.id,publish:true},admin.cookie)).status,200);assert.equal((await(await call('community-reviews','GET',undefined,reader.cookie)).json()).reviews.length,1);
await call('community-reviews/'+rating.id,'DELETE',undefined,seller.cookie);assert.equal((await(await call('community-reviews','GET',undefined,reader.cookie)).json()).reviews.length,1);await call('community-reviews/'+rating.id,'DELETE',undefined,reader.cookie);assert.equal((await(await call('community-reviews','GET',undefined,reader.cookie)).json()).reviews.length,0);
const privateRating={...rating,id:crypto.randomUUID(),publicConsent:false};await call('feedback','POST',privateRating,reader.cookie);assert.equal((await call('admin/publish-feedback','POST',{id:privateRating.id,publish:true},admin.cookie)).status,400);
assert.equal((await call('feedback','POST',{...rating,id:crypto.randomUUID(),kind:'report'},reader.cookie)).status,400);
console.log('PASS following-only Home, public rating-only profiles, multilingual catalog search, first-film picture matches, automatic admin recognition, approved-only discovery, real subscriptions and cancellation, bulk-notice replay protection, recipient privacy and opt-in public-rating publication/revocation');

// Suggested people use existing accounts, and following still sends one notice.
const nani=await account('nani'),darling=await account('darling'),bob=await account('urstruly_bob'),varun=await account('varun_bankaa');
assert.equal((await call('members?suggested=1')).status,401);
let suggested=await(await call('members?suggested=1','GET',undefined,reader.cookie)).json();
assert.deepEqual(suggested.members.map((m:any)=>m.username),['nani','darling','urstruly_bob','varun_bankaa']);
assert.ok(suggested.members.every((m:any)=>!('email' in m)));
const selfSuggestions=await(await call('members?suggested=1','GET',undefined,nani.cookie)).json();assert.ok(!selfSuggestions.members.some((m:any)=>m.id===nani.id));
await call('members/nani/follow','POST',{following:true},reader.cookie);await call('members/nani/follow','POST',{following:true},reader.cookie);
assert.equal((await one<any>("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND title='New follower'",[nani.id])).n,1);
await run('INSERT INTO removed_accounts(user_id,removed_by,removed_at) VALUES(?,?,?)',[darling.id,admin.id,new Date().toISOString()]);
suggested=await(await call('members?suggested=1','GET',undefined,reader.cookie)).json();assert.deepEqual(suggested.members.map((m:any)=>m.username),['urstruly_bob','varun_bankaa']);

const halfRating={id:crypto.randomUUID(),kind:'rating',category:'feedback',rating:3.5,message:'Useful website, with room to improve.',publicConsent:true};
assert.equal((await call('feedback','POST',halfRating,reader.cookie)).status,200);
assert.equal((await one<any>('SELECT rating FROM member_feedback WHERE id=?',[halfRating.id])).rating,3.5);
assert.ok(!(await(await call('community-reviews','GET',undefined,seller.cookie)).json()).reviews.some((r:any)=>r.id===halfRating.id),'Unapproved reviews remain private');
assert.equal((await call('admin/publish-feedback','POST',{id:halfRating.id,publish:true},admin.cookie)).status,200);
assert.equal((await(await call('community-reviews','GET',undefined,seller.cookie)).json()).reviews.find((r:any)=>r.id===halfRating.id).rating,3.5);
const lowRating={...halfRating,id:crypto.randomUUID(),rating:2,publicConsent:false};
assert.equal((await call('feedback','POST',lowRating,reader.cookie)).status,200);
assert.equal((await call('admin/publish-feedback','POST',{id:lowRating.id,publish:true},admin.cookie)).status,400);
assert.equal((await call('community-reviews/'+lowRating.id,'POST',{},reader.cookie)).status,200);
assert.equal((await call('admin/publish-feedback','POST',{id:lowRating.id,publish:true},admin.cookie)).status,200);
assert.equal((await(await call('community-reviews','GET',undefined,seller.cookie)).json()).reviews.find((r:any)=>r.id===lowRating.id).rating,2);
assert.equal((await call('feedback','POST',{...halfRating,id:crypto.randomUUID(),rating:3.25},reader.cookie)).status,400);
assert.equal((await call('feedback','POST',{...halfRating,id:crypto.randomUUID(),rating:5.5},reader.cookie)).status,400);
await call('community-reviews/'+halfRating.id,'DELETE',undefined,reader.cookie);
assert.ok(!(await(await call('community-reviews','GET',undefined,seller.cookie)).json()).reviews.some((r:any)=>r.id===halfRating.id));
assert.equal((await call('movies/2','PUT',{rating:7},reader.cookie)).status,200);
assert.equal((await(await call('movies/2','GET',undefined,reader.cookie)).json()).state.rating,7);
console.log('PASS ordered real-account suggestions, self/followed/removed exclusion, follower notice deduplication, exact half-star storage and consent/approval for all review scores');
