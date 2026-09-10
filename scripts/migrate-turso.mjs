import fs from 'node:fs/promises';
const url=(process.env.TURSO_HTTP_URL||'').replace(/^(turso|libsql):/,'https:').replace(/\/$/,'');
const token=process.env.TURSO_AUTH_TOKEN;if(!url||!token){if(process.argv.includes('--if-configured')){console.log('Database migration skipped: no database configured for this build.');process.exit(0);}throw new Error('Set TURSO_HTTP_URL and TURSO_AUTH_TOKEN in .env.local');}
async function execute(sql,args=[]){const r=await fetch(url+'/v2/pipeline',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args:args.map(value=>({type:'text',value}))}},{type:'close'}]})});const d=await r.json();if(!r.ok||d.results?.[0]?.type!=='ok')throw new Error('Migration query failed');return d.results[0].response.result;}
await execute('CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY)');
for(const name of (await fs.readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){const applied=await execute('SELECT name FROM app_migrations WHERE name=?',[name]);if(applied.rows.length)continue;const sql=await fs.readFile('drizzle/'+name,'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await execute(statement);await execute('INSERT INTO app_migrations(name) VALUES(?)',[name]);console.log('Applied',name);}

const {default:webpush}=await import('web-push');
const keys=webpush.generateVAPIDKeys();
await execute('INSERT OR IGNORE INTO app_config(key,value) VALUES(?,?)',['webpush-vapid',JSON.stringify(keys)]);
console.log('Database and browser notification keys ready.');
