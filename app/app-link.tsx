'use client';
import {useEffect,useState,type AnchorHTMLAttributes,type MouseEvent} from 'react';

// The app shares one shell across its catch-all URLs. Native history updates
// keep the authenticated shell mounted without requesting an RSC transition.
export function navigate(href:string){
  window.history.pushState(null,'',href);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({top:0,behavior:'instant'});
}
export function useAppPath(initial:string[]){
  const [path,setPath]=useState(initial);
  useEffect(()=>{
    const update=()=>setPath(window.location.pathname.split('/').filter(Boolean));
    update();window.addEventListener('popstate',update);
    return()=>window.removeEventListener('popstate',update);
  },[]);
  return path;
}
export default function AppLink({href='',onClick,target,download,...props}:AnchorHTMLAttributes<HTMLAnchorElement>){
  function click(e:MouseEvent<HTMLAnchorElement>){
    onClick?.(e);
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||download!==undefined||(target&&target!=='_self')||!href.startsWith('/')||href.startsWith('//'))return;
    e.preventDefault();navigate(href);
  }
  return <a {...props} href={href} target={target} download={download} onClick={click}/>;
}
