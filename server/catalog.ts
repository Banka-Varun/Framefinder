import seed from '@/data/movies.json';
import {setting} from '@/lib/platform';
export type Film=typeof seed[number]&{tmdbId?:number};
export const catalog:Film[]=seed;
export const hasPoster=(m:Film)=>!!m.poster;
const byId=new Map(catalog.map(m=>[m.id,m]));
const codes:Record<string,string>={English:'en',Telugu:'te',Hindi:'hi',Tamil:'ta',Malayalam:'ml',Kannada:'kn',Korean:'ko',Japanese:'ja',French:'fr'};
const genreNames:Record<number,string>={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-fi',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'};
// Bounded, shared-per-instance cache and in-flight deduplication for public movie data.
const providerCache=new Map<string,{expires:number;data:any}>();
const providerPending=new Map<string,Promise<any>>();
export async function tmdb(path:string,params:Record<string,string>={}){
 if(!setting('TMDB_READ_TOKEN'))return null;const url=new URL('https://api.themoviedb.org/3/'+path);Object.entries(params).sort().forEach(([k,v])=>url.searchParams.set(k,v));const key=url.href,hit=providerCache.get(key);if(hit&&hit.expires>Date.now())return hit.data;if(providerPending.has(key))return providerPending.get(key);
 const work=(async()=>{const r=await fetch(url,{headers:{Authorization:'Bearer '+setting('TMDB_READ_TOKEN')},signal:AbortSignal.timeout(8000),next:{revalidate:900}});if(!r.ok)throw new Error('Movie catalog provider is temporarily unavailable.');const data=await r.json();if(providerCache.size>=300)providerCache.delete(providerCache.keys().next().value!);providerCache.set(key,{data,expires:Date.now()+900000});return data;})();providerPending.set(key,work);try{return await work;}finally{providerPending.delete(key);}
}
function normalize(m:any):Film{return {id:1000000+m.id,tmdbId:m.id,title:m.title,year:Number((m.release_date||'').slice(0,4))||0,language:Object.entries(codes).find(([,v])=>v===m.original_language)?.[0]||m.original_language,minutes:m.runtime||0,genres:(m.genres?.map((g:any)=>g.name)||m.genre_ids?.map((id:number)=>genreNames[id])||[]).filter(Boolean),moods:[],description:m.overview||'',poster:m.poster_path?'https://image.tmdb.org/t/p/w500'+m.poster_path:'',source:'https://www.themoviedb.org/movie/'+m.id};}
export async function findFilm(id:number):Promise<Film|null>{const local=byId.get(id);if(local)return local;if(id<1000000)return null;const m=await tmdb('movie/'+(id-1000000));return m?normalize(m):null;}
export async function movies(url:URL){
 const q=(url.searchParams.get('q')||'').normalize('NFKC').trim().toLowerCase().slice(0,120),language=url.searchParams.get('language')||'',page=Math.min(500,Math.max(1,Math.floor(Number(url.searchParams.get('page'))||1))),genre=url.searchParams.get('genre')||'';
 const localMatches=catalog.filter(m=>hasPoster(m)&&(!q||m.title.toLowerCase().includes(q))&&(!language||m.language===language)&&(!genre||m.genres.includes(genre)));
 let notice='';
 if(setting('TMDB_READ_TOKEN')){try{
  const genreId=Object.entries(genreNames).find(([,name])=>name===genre)?.[0];
  const remote=await tmdb(q?'search/movie':'discover/movie',{page:String(page),include_adult:'false',...(q?{query:q}:{sort_by:'popularity.desc','vote_count.gte':'50','vote_average.gte':'6','release_date.lte':new Date().toISOString().slice(0,10),...(language?{with_original_language:codes[language]||language}:{}),...(genreId?{with_genres:genreId}:{})})});
  let results:Film[]=remote.results.map(normalize).filter(hasPoster);if(q&&language)results=results.filter(m=>m.language===language);if(q&&genre)results=results.filter(m=>m.genres.includes(genre));
  // Preserve known IDs when the provider returns a bundled film already in members' diaries.
  results=results.map(m=>catalog.find(local=>local.title.toLowerCase()===m.title.toLowerCase()&&local.year===m.year&&local.language===m.language)||m);
  return {movies:results,total:remote.total_results,pages:Math.min(remote.total_pages,500),page,source:'TMDB',notice:q?'Counts include provider search results before language and poster filters.':''};
 }catch{notice='The full catalog is temporarily unavailable. Showing included films.';}}
 else notice='Showing the included catalog. More films become available when the full catalog is connected.';
 return {movies:localMatches.slice((page-1)*24,page*24),total:localMatches.length,pages:Math.ceil(localMatches.length/24),page,source:'Included catalog',notice};
}
export async function providers(film:Film,region:string){let id=film.tmdbId;if(!id){const data=await tmdb('search/movie',{query:film.title,year:String(film.year)});id=data?.results?.find((x:any)=>x.title.toLowerCase()===film.title.toLowerCase())?.id;}if(!id)return {configured:!!setting('TMDB_READ_TOKEN'),providers:[],link:null,region};const data=await tmdb(`movie/${id}/watch/providers`);const entry=data?.results?.[region];return {configured:true,providers:['flatrate','rent','buy'].flatMap(type=>(entry?.[type]||[]).map((x:any)=>({name:x.provider_name,type,logo:'https://image.tmdb.org/t/p/w92'+x.logo_path}))),link:entry?.link||null,region,attribution:'Watch availability by JustWatch via TMDB'};}
