'use client';
import {Star} from 'lucide-react';
import {useEffect,useId,useState} from 'react';

export function RatingStars({value}:{value:number}) {
 return <span className="rating-stars-display" aria-label={value+' out of 5 stars'}>{[1,2,3,4,5].map(n=><span className="rating-star" key={n} aria-hidden="true"><Star/><span style={{width:Math.max(0,Math.min(1,value-n+1))*100+'%'}}><Star fill="currentColor"/></span></span>)}<strong>{value} / 5</strong></span>;
}

export default function StarRating({value,onChange,onCommit,disabled=false,min=0.5,name,label='Your rating',allowClear=false}:{value:number|null;onChange?:(value:number|null)=>void;onCommit?:(value:number|null)=>void;disabled?:boolean;min?:number;name?:string;label?:string;allowClear?:boolean}) {
 const [draft,setDraft]=useState(value);const id=useId();
 useEffect(()=>{setDraft(value)},[value]);
 function change(next:number|null){setDraft(next);onChange?.(next)}
 function commit(next:number|null){if(next!==value)onCommit?.(next)}
 return <fieldset className="star-rating-control" disabled={disabled}><legend>{label}</legend>
  <div className="rating-star-buttons">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={'Rate '+n+' stars; use slider for half stars'} onClick={event=>{const box=event.currentTarget.getBoundingClientRect();const half=event.detail>0&&event.clientX<box.left+box.width/2;const next=Math.max(min,half?n-0.5:n);change(next);commit(next)}}><span className="rating-star" aria-hidden="true"><Star/><span style={{width:Math.max(0,Math.min(1,(draft||0)-n+1))*100+'%'}}><Star fill="currentColor"/></span></span></button>)}</div>
  <p className="rating-value" aria-live="polite">{draft===null?'Not rated yet':draft+' / 5 stars'}</p>
  <label className="sr-only" htmlFor={id}>{label} in half-star steps</label>
  <input id={id} type="range" min={min} max={5} step={0.5} value={draft??min} aria-valuetext={draft===null?'Not rated yet':draft+' out of 5 stars'} onChange={event=>change(Number(event.target.value))} onPointerUp={event=>{const next=Number(event.currentTarget.value);change(next);commit(next)}} onKeyUp={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))commit(Number(event.currentTarget.value))}}/>
  {name&&<input type="hidden" name={name} value={draft??''}/>}
  <div className="rating-control-note"><small>Tap a star or drag below. Half stars welcome.</small>{allowClear&&draft!==null&&<button className="text-button" type="button" onClick={()=>{change(null);commit(null)}}>Clear rating</button>}</div>
 </fieldset>;
}
