import upcoming from '@/data/upcoming-movies.json';
import {catalog,tmdb} from './catalog';
import {ApiError} from './security';
const key=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const cache=new Map<string,{url:string;expires:number}>();
const pending=new Map<string,Promise<string|null>>();
async function findPoster(title:string,year:string,id:string){const normalized=key(title)+':'+year+':'+id;const hit=cache.get(normalized);if(hit&&hit.expires>Date.now())return hit.url;const local=[...upcoming,...catalog].find(m=>key(m.title)===key(title)&&(!year||!('year' in m)||String(m.year)===year));let url='';
 try{let movie:any=null;if(/^\d+$/.test(id)&&Number(id)>=1000000)movie=await tmdb('movie/'+(Number(id)-1000000));else{const data=await tmdb('search/movie',{query:title,...(year?{year}:{})});movie=data?.results?.find((m:any)=>key(m.title)===key(title)||key(m.original_title||'')===key(title));}if(movie?.poster_path)url='https://image.tmdb.org/t/p/w500'+movie.poster_path;}catch{/* Fall back to known artwork if the catalog is unavailable. */}
 url=url||local?.poster||'';if(url){if(cache.size>=500)cache.delete(cache.keys().next().value!);cache.set(normalized,{url,expires:Date.now()+3600000});}return url||null;}
export async function posterResponse(req:Request){if(req.method!=='GET')throw new ApiError(405,'Method not allowed');const q=new URL(req.url).searchParams,title=(q.get('title')||'').trim().slice(0,120),year=q.get('year')||'',id=q.get('id')||'';if(!title)throw new ApiError(400,'Choose a film');const k=key(title)+year+id;let work=pending.get(k);if(!work){work=findPoster(title,year,id);pending.set(k,work);}let url:string|null;try{url=await work;}finally{pending.delete(k);}if(!url)throw new ApiError(404,'Poster unavailable');return new Response(null,{status:302,headers:{Location:url}});}
