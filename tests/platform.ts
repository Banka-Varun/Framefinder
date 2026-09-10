import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
const db=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
export const settings:Record<string,string>={};
export const setting=(key:string)=>settings[key]||'';
export async function one<T>(sql:string,args:any[]=[]){return (db.prepare(sql).get(...args)||null) as T|null;}
export async function all<T>(sql:string,args:any[]=[]){return db.prepare(sql).all(...args) as T[];}
export async function run(sql:string,args:any[]=[]){return {changes:Number(db.prepare(sql).run(...args).changes)};}
export async function batch(statements:{sql:string;args?:any[]}[]){db.exec('BEGIN');try{const result=statements.map(s=>db.prepare(s.sql).run(...(s.args||[])));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
const assets=new Map<string,{bytes:ArrayBuffer;mime:string}>();
export async function putAsset(key:string,bytes:ArrayBuffer,mime:string){assets.set(key,{bytes,mime});}
export async function getAsset(key:string){const f=assets.get(key);return f?{body:f.bytes,mime:f.mime}:null;}
