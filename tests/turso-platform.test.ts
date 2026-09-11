import assert from 'node:assert/strict';
process.env.TURSO_HTTP_URL='libsql://framefinder-test.turso.io';
process.env.TURSO_AUTH_TOKEN='test-token';
const calls:{url:string;body:any}[]=[];
const ok={type:'ok',response:{type:'execute',result:{cols:[],rows:[],affected_row_count:1,last_insert_rowid:null}}};
const responses=[
 {baton:'baton-1',base_url:'https://sticky.turso.io/',results:[ok]},
 {baton:'baton-2',base_url:null,results:[ok,ok]},
 {baton:null,base_url:null,results:[ok,{type:'ok',response:{type:'close'}}]},
];
globalThis.fetch=(async(input:any,init:any)=>{calls.push({url:String(input),body:JSON.parse(init.body)});return new Response(JSON.stringify(responses.shift()),{status:200,headers:{'Content-Type':'application/json'}})}) as any;
const {batch}=await import('../lib/platform');
await batch([{sql:'INSERT INTO example VALUES(?)',args:[1]},{sql:'UPDATE example SET value=?',args:[2]}]);
assert.equal(calls.length,3);
assert.equal(calls[0].body.baton,null);
assert.equal(calls[1].url,'https://sticky.turso.io/v2/pipeline');
assert.equal(calls[1].body.baton,'baton-1');
assert.equal(calls[2].body.baton,'baton-2');
assert.equal(calls[2].url,'https://sticky.turso.io/v2/pipeline');
console.log('PASS Turso transactions follow rotated batons and sticky stream URLs');

process.env.SUPABASE_URL='https://storage.example.com';process.env.SUPABASE_STORAGE_BUCKET='private-assets';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
const {deleteAsset}=await import('../lib/platform');
globalThis.fetch=(async(input:any,init:any)=>{assert.equal(String(input),'https://storage.example.com/storage/v1/object/private-assets');assert.equal(init.method,'DELETE');assert.deepEqual(JSON.parse(init.body),{prefixes:['asset-to-erase']});return Response.json([]);}) as any;
await deleteAsset('asset-to-erase');
globalThis.fetch=(async()=>new Response('',{status:503})) as any;await assert.rejects(()=>deleteAsset('asset-to-erase'));
console.log('PASS private-storage erasure uses the bucket removal endpoint and reports failures for durable retry');
