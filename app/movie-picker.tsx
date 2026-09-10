'use client';
import {useState} from 'react';
import {Film} from 'lucide-react';
import upcoming from '@/data/upcoming-movies.json';
import featured from '@/data/featured-movies.json';

export function MovieArtwork({title,detail=false}:{title:string;detail?:boolean}){
  const movie=[...upcoming,...featured].find(m=>m.title.toLowerCase()===title.trim().toLowerCase());
  const [failed,setFailed]=useState('');
  return <div className={'booking-movie-art '+(detail?'large':'')}>
    {movie?.poster&&failed!==movie.poster?<img src={movie.poster} alt={title+' poster'} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(movie.poster)}/>:<div className="movie-art-fallback"><Film aria-hidden="true"/><span>{title||'Choose a movie'}</span></div>}
  </div>;
}
export default function MoviePicker({value,onChange,name='title',label='Movie title',disabled=false}:{value:string;onChange:(v:string)=>void;name?:string;label?:string;disabled?:boolean}){
  const [custom,setCustom]=useState(false);
  const selected=upcoming.find(m=>m.title===value);
  return <div className="movie-picker">
    <label>{label} *<select required disabled={disabled} value={custom?'__other__':value} onChange={e=>{setCustom(e.target.value==='__other__');onChange(e.target.value==='__other__'?'':e.target.value)}}>
      <option value="">Choose a movie</option>
      {['Telugu','English'].map(language=><optgroup label={language==='English'?'Hollywood · upcoming':'Telugu · upcoming'} key={language}>{upcoming.filter(m=>m.language===language).map(m=><option value={m.title} key={m.title}>{m.title}</option>)}</optgroup>)}
      <optgroup label="Other films & re-releases">{featured.filter(m=>!upcoming.some(u=>u.title===m.title)).map(m=><option key={m.id} value={m.title}>{m.title} ({m.year})</option>)}</optgroup>
      <option value="__other__">Enter another movie title…</option>
    </select></label>
    {custom&&<label>Exact movie title<input required disabled={disabled} maxLength={120} value={value} onChange={e=>onChange(e.target.value)}/></label>}
    <input type="hidden" name={name} value={value}/>
    {value&&<div className="selected-movie"><MovieArtwork title={value}/><div><strong>{value}</strong>{selected&&<><p>{selected.language} · {selected.releaseLabel}</p><small>Announced release information; local shows may differ.</small></>}</div></div>}
  </div>;
}
