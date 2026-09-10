const {build}=await import('esbuild').catch(()=>import('../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js'));
import path from 'node:path';
import fs from 'node:fs/promises';
for (const entry of ['api','navigation']) {
const target='/tmp/framefinder-'+entry+'-test.mjs';
await build({entryPoints:['tests/'+entry+'.test.ts'],outfile:target,bundle:true,platform:'node',format:'esm',target:'node22',alias:{'@/lib/platform':path.resolve('tests/platform.ts'),'@':path.resolve('.')},logLevel:'warning'});
await import(target);
await fs.unlink(target);

}
