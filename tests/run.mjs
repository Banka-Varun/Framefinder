const {build}=await import('esbuild').catch(()=>import('../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js'));
import path from 'node:path';
import fs from 'node:fs/promises';
for (const entry of ['api','navigation','social-features','turso-platform','google-link','profile-ticket','menu-usernames','product-update']) {
const target=path.resolve('tests/.compiled-'+entry+'.mjs');
await build({entryPoints:['tests/'+entry+'.test.ts'],outfile:target,bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',alias:{'@/lib/platform':path.resolve('tests/platform.ts'),'@':path.resolve('.')},logLevel:'warning'});
await import(target);
await fs.unlink(target);

}
