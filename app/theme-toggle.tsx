'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
export default function ThemeToggle(){
 const [theme,setTheme]=useState('dark');
 useEffect(()=>{try{const saved=localStorage.getItem('ff-theme');const value=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';setTheme(value);document.documentElement.dataset.theme=value;}catch{}},[]);
 function toggle(){const next=theme==='dark'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem('ff-theme',next);}catch{}}
 return <button type="button" className="theme-toggle" onClick={toggle} aria-label={'Switch to '+(theme==='dark'?'light':'dark')+' mode'} title={'Switch to '+(theme==='dark'?'light':'dark')+' mode'}>{theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button>;
}
