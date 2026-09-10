'use client';
import {useState} from 'react';
import {Plus,X} from 'lucide-react';
import {indiaToday} from '@/lib/booking';
export default function ShowDates({dates,onChange,disabled}:{dates:string[];onChange:(dates:string[])=>void;disabled:boolean}){
  const [start,setStart]=useState(''),[end,setEnd]=useState(''),[error,setError]=useState('');
  function add(){
    setError('');const last=end||start;
    if(!start||start<indiaToday()||last<start){setError('Choose today or a future date, with the end on or after the start.');return;}
    const count=(Date.parse(last)-Date.parse(start))/86400000+1;
    if(!Number.isInteger(count)||count<1||count>31){setError('Choose a range of up to 31 dates.');return;}
    const added=Array.from({length:count},(_,i)=>new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10));
    const merged=[...new Set([...dates,...added])].sort();
    if(merged.length>31){setError('You can follow up to 31 dates per alert. Remove some dates first.');return;}
    onChange(merged);setStart('');setEnd('');
  }
  return <fieldset disabled={disabled}><legend>4 · Show dates <small>{dates.length}/31 selected</small></legend>
    <div className="form-pair"><label>Date or range start<input type="date" min={indiaToday()} value={start} onChange={e=>setStart(e.target.value)}/></label><label>Range end · optional<input type="date" min={start||indiaToday()} value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
    <button type="button" className="button secondary" onClick={add} disabled={!start||dates.length>=31}><Plus size={16}/>{end?'Add date range':'Add date'}</button>
    <p className="small">Add individual dates or a consecutive range. You can remove any selected date below.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}
    <div className="date-chips">{dates.map(d=><button type="button" key={d} aria-label={'Remove '+d} onClick={()=>onChange(dates.filter(x=>x!==d))}>{new Date(d+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}<X size={14}/></button>)}</div>
  </fieldset>;
}
