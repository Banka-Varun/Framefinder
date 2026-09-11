'use client';
import {useState} from 'react';
import {visiblePicture} from '@/lib/profile-pictures';
export default function ProfilePhoto({name,src,className='avatar'}:{name:string;src?:string|null;className?:string}){const[failed,setFailed]=useState('');const url=visiblePicture(src);return url&&failed!==url?<img className={className} src={url} alt="" loading="lazy" onError={()=>setFailed(url)}/>:<span className={className+' initials'} aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?'}</span>;}
