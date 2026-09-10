import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/v1/[...path]/route';
import {settings,one} from './platform';
import {avatarUrl,starterAvatar} from '../lib/avatar';
const base='https://framefinder.test';
async function call(path:string,method='GET',data?:unknown,cookie=''){const u=new URL(base+'/api/v1/'+path);return ({GET,POST} as any)[method](new Request(u,{method,headers:{origin:base,cookie,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})}),{params:Promise.resolve({path:u.pathname.slice('/api/v1/'.length).split('/')})}) as Promise<Response>;}
async function signup(username:string,extra:any={}){const r=await call('auth/signup','POST',{name:username,username,email:username+'@example.com',password:'profile test password',...extra});assert.equal(r.status,200);const cookie=r.headers.getSetCookie()[0].split(';')[0];const session=await(await call('auth/session','GET',undefined,cookie)).json() as any;return {cookie,user:session.user};}
const admin=await signup('profile_admin'),other=await signup('profile_other',{avatarDesign:'rose.deep.long.grin.glasses'});
assert.equal(other.user.avatar,'/api/v1/avatar?design=rose.deep.long.grin.glasses');
assert.match(admin.user.avatar,/^\/api\/v1\/avatar\?design=/);
assert.equal((await call('avatar?design=mint.warm.curly.smile.none')).status,200);
const svg=await call('avatar?design=mint.warm.curly.smile.none');assert.match(svg.headers.get('content-type')!,/image\/svg\+xml/);assert.match(svg.headers.get('content-security-policy')!,/sandbox/);assert.match(await svg.text(),/<svg/);
assert.equal((await call('avatar?design='+encodeURIComponent('<script>alert(1)</script>'))).status,400);
assert.equal((await call('me/avatar','POST',{design:'sky.tan.short.calm.stars'})).status,401);
assert.equal((await call('me/avatar','POST',{design:'sky.tan.short.calm.stars',userId:other.user.id},admin.cookie)).status,200);
assert.equal((await one<any>('SELECT avatar FROM accounts WHERE id=?',[other.user.id])).avatar,other.user.avatar);
assert.equal((await(await call('auth/session','GET',undefined,admin.cookie)).json() as any).user.avatar,'/api/v1/avatar?design=sky.tan.short.calm.stars');
assert.equal((await call('me/avatar','POST',{design:'https://evil.test'},admin.cookie)).status,400);
console.log('PASS avatar generation, safe public SVG, signup selection, saved design and account isolation');
settings.ADMIN_USER_IDS=admin.user.id;
assert.equal((await(await call('admin/access','GET',undefined,admin.cookie)).json() as any).verified,false);
assert.equal((await call('admin/access','POST',{},admin.cookie)).status,200);
for(let i=0;i<3;i++)assert.equal((await(await call('admin/access','GET',undefined,admin.cookie)).json() as any).verified,true);
const anotherLogin=await call('auth/login','POST',{identity:'profile_admin',password:'profile test password'});const anotherCookie=anotherLogin.headers.getSetCookie()[0].split(';')[0];assert.equal((await(await call('admin/access','GET',undefined,anotherCookie)).json() as any).verified,false);
assert.equal((await call('admin/access','POST',{},other.cookie)).status,403);
settings.ADMIN_USER_IDS='';assert.equal((await call('admin/access','GET',undefined,admin.cookie)).status,403);assert.equal((await call('admin','GET',undefined,admin.cookie)).status,403);
settings.ADMIN_USER_IDS=admin.user.id;await call('auth/logout','POST',{},admin.cookie);assert.equal((await call('admin/access','GET',undefined,admin.cookie)).status,401);
assert.equal((await one<any>("SELECT COUNT(*) n FROM auth_tokens WHERE purpose='admin-access'")).n,0);
console.log('PASS admin verification survives navigation, remains session-bound and respects logout and role revocation');
