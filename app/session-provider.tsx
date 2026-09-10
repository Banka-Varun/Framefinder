'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {api,clearClientData} from './client-data';
const Context=createContext<{data:any;error:string;reload:()=>void}>({data:null,error:'',reload:()=>{}});
export function SessionProvider({children}:{children:ReactNode}){const[data,setData]=useState<any>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);useEffect(()=>{let active=true;api('auth/session').then(d=>{if(active){setData(d);setError('')}}).catch(e=>active&&setError(e.message));const expire=()=>{clearClientData();setData({user:null})};const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('framefinder-auth'):null;if(channel)channel.onmessage=()=>{clearClientData();setRevision(v=>v+1)};window.addEventListener('ff-session-expired',expire);return()=>{active=false;channel?.close();window.removeEventListener('ff-session-expired',expire)}},[revision]);return <Context.Provider value={{data,error,reload:()=>{clearClientData();setRevision(v=>v+1)}}}>{children}</Context.Provider>}
export const useSession=()=>useContext(Context);
export function announceSignOut(){if(typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel('framefinder-auth');c.postMessage('changed');c.close()}}
