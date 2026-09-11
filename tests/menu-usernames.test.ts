import assert from 'node:assert/strict';
import {GET, POST, PUT} from '../app/api/v1/[...path]/route';
import {settings, one} from './platform';
import {createGoogleAccount} from '../server/usernames';
import {usernameFromName, usernameSchema} from '../lib/username';

const base = 'https://framefinder.test';
async function call(path: string, method = 'GET', data?: unknown, cookie = '') {
  return ({GET, POST, PUT} as any)[method](new Request(base + '/api/v1/' + path, {
    method, headers: {origin: base, cookie, 'Content-Type': 'application/json'},
    ...(data === undefined ? {} : {body: JSON.stringify(data)}),
  }), {params: Promise.resolve({path: path.split('?')[0].split('/')})}) as Promise<Response>;
}
async function signup(username: string) {
  const response = await call('auth/signup', 'POST', {name: username, username, email: username + '@example.com', password: 'username test password'});
  assert.equal(response.status, 200);
  const cookie = response.headers.getSetCookie()[0].split(';')[0];
  const {user} = await (await call('auth/session', 'GET', undefined, cookie)).json();
  return {cookie, user};
}

assert.equal(usernameFromName('Varun Banka'), 'varunbanka');
assert.equal(usernameFromName('José Silva'), 'josesilva');
for (const name of ['李', '123', 'A', 'x'.repeat(100), '—']) assert.ok(usernameSchema.safeParse(usernameFromName(name)).success);
const owner = await signup('varunbanka'), stranger = await signup('stranger');
const generated = await Promise.all([1,2,3].map(n => createGoogleAccount({name: 'Varun Banka', email: `google${n}@example.com`, sub: `google-${n}`})));
const handles = await Promise.all(generated.map(id => one<any>('SELECT username FROM accounts WHERE id=?', [id])));
assert.deepEqual(handles.map(x => x.username).sort(), ['varunbanka2', 'varunbanka3', 'varunbanka4']);
const availability = await (await call('auth/username?name=Varun%20Banka&username=varunbanka')).json();
assert.equal(availability.available, false); assert.equal(availability.suggestion, 'varunbanka5');
assert.equal((await call('auth/username?username=UPPERCASE')).status, 200);
assert.equal((await call('auth/username?username=x')).status, 400);
assert.equal((await call('auth/signup', 'POST', {name:'Other',username:'varunbanka',email:'other@example.com',password:'another test password'})).status,409);
await call('movies/2', 'PUT', {liked:true,watched:true}, owner.cookie);
assert.equal((await call('me', 'PUT', {username:'stranger',name:'Changed',bio:'',languages:['Telugu']}, owner.cookie)).status,409);
assert.equal((await one<any>('SELECT name FROM accounts WHERE id=?',[owner.user.id])).name, 'varunbanka');
assert.equal((await call('me', 'PUT', {username:'varun_banka',name:'Varun Banka',bio:'',languages:['Telugu']}, owner.cookie)).status,200);
assert.equal((await one<any>('SELECT liked FROM social_state WHERE user_id=? AND movie_id=2',[owner.user.id])).liked,1);
assert.equal((await call('members/varun_banka','GET',undefined,stranger.cookie)).status,200);
console.log('PASS name-based handles, concurrent collisions, availability, rename conflicts and stable account history');

assert.equal((await call('feed')).status,401);
assert.equal((await (await call('feed','GET',undefined,stranger.cookie)).json()).activity.length,0);
await call('members/varun_banka/follow','POST',{following:true},stranger.cookie);
const feed=await (await call('feed','GET',undefined,stranger.cookie)).json();
assert.equal(feed.activity.length,1);assert.equal(feed.activity[0].username,'varun_banka');assert.equal(feed.activity[0].movie.id,2);
console.log('PASS Home feed only includes followed members and requires a session');

const message={id:crypto.randomUUID(),kind:'report',category:'upload',message:'The image upload fails with a size error.'};
assert.equal((await call('feedback','POST',message)).status,401);
assert.equal((await call('feedback','POST',message,owner.cookie)).status,200);
assert.equal((await call('feedback','POST',message,owner.cookie)).status,200);
assert.equal((await one<any>('SELECT COUNT(*) n FROM member_feedback WHERE id=?',[message.id])).n,1);
assert.equal((await call('feedback','POST',message,stranger.cookie)).status,409);
assert.equal((await call('feedback','GET',undefined,owner.cookie)).status,405);
assert.equal((await call('admin','GET',undefined,stranger.cookie)).status,403);
assert.equal((await call('feedback','POST',{id:crypto.randomUUID(),kind:'rating',category:'feedback',message:'',rating:6},owner.cookie)).status,400);
assert.equal((await call('feedback','POST',{id:crypto.randomUUID(),kind:'rating',category:'feedback',message:'',rating:4},owner.cookie)).status,200);
settings.ADMIN_USER_IDS=stranger.user.id;
const inbox=await (await call('admin','GET',undefined,stranger.cookie)).json();
assert.equal(inbox.feedback.length,2);assert.equal(inbox.feedback.find((x:any)=>x.id===message.id).username,'varun_banka');
assert.equal((await call('admin/feedback','POST',{id:message.id,status:'resolved'},owner.cookie)).status,403);
assert.equal((await call('admin/feedback','POST',{id:message.id,status:'resolved'},stranger.cookie)).status,200);
assert.equal((await one<any>('SELECT status FROM member_feedback WHERE id=?',[message.id])).status,'resolved');
console.log('PASS private support storage, retry deduplication, rating validation and admin-only review');
