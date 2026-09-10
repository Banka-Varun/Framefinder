'use client';
import {useState,useId} from 'react';
import {useLoad,useDebounced} from './client-data';
import {Film} from 'lucide-react';
import upcoming from '@/data/upcoming-movies.json';
import featured from '@/data/featured-movies.json';

export function MovieArtwork({title,detail=false}:{title:string;detail?:boolean}){
  const movie=[...upcoming,...featured].find(m=>m.title.toLowerCase()===title.trim().toLowerCase());
  const [failed,setFailed]=useState('');const source='/api/v1/posters?title='+encodeURIComponent(title);
  return <div className={'booking-movie-art '+(detail?'large':'')}>
    {title&&failed!==source?<img src={source} alt={title+' poster'} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(source)}/>:<div className="movie-art-fallback"><Film aria-hidden="true"/><span>{title||'Choose a movie'}</span></div>}
  </div>;
}
export default function MoviePicker({value,onChange,name='title',label='Movie title',disabled=false}:{value:string;onChange:(v:string)=>void;name?:string;label?:string;disabled?:boolean}){
 const id=useId(),query=useDebounced(value.trim().toLowerCase());const{data,error}=useLoad('movies?q='+encodeURIComponent(query));
 const options=[...upcoming,...featured,...(data?.movies||[])].filter((m,i,rows)=>rows.findIndex(x=>x.title.toLowerCase()===m.title.toLowerCase())===i);
 const selected=upcoming.find(m=>m.title.toLowerCase()===value.trim().toLowerCase());
 return <div className="movie-picker"><label>{label} *<input name={name} value={value} required disabled={disabled} list={id} maxLength={120} autoComplete="off" placeholder="Search or choose a movie…" onChange={e=>onChange(e.target.value)} onBlur={()=>{const match=options.find(m=>m.title.toLowerCase()===value.trim().toLowerCase());if(match)onChange(match.title);}}/><datalist id={id}>{options.map(m=><option value={m.title} key={m.title}>{m.language}{'year' in m?' · '+m.year:''}</option>)}</datalist></label>{error&&<p className="small">Catalog search is unavailable. You can still enter the movie title.</p>}{value&&<div className="selected-movie"><MovieArtwork title={value}/><div><strong>{value}</strong>{selected&&<><p>{selected.language} · {selected.releaseLabel}</p><small>Announced release information; local shows may differ.</small></>}</div></div>}</div>;
}
