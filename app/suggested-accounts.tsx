'use client';
import {useState} from 'react';
import {Check,Plus} from 'lucide-react';
import {api,useLoad} from './client-data';
import Link from './app-link';
import ProfilePhoto from './profile-photo';
export default function SuggestedAccounts({onFollow}:{onFollow:()=>void}) {
 const {data,error}=useLoad('members?suggested=1');const[followed,setFollowed]=useState<string[]>([]),[busy,setBusy]=useState<string[]>([]),[message,setMessage]=useState('');
 async function follow(id:string,username:string){setBusy(values=>[...values,id]);setMessage('');try{await api('members/'+encodeURIComponent(username)+'/follow',{following:true});setFollowed(values=>[...values,id]);onFollow();}catch(error){setMessage((error as Error).message)}finally{setBusy(values=>values.filter(value=>value!==id))}}
 if(!data&&!error)return <p className="small" role="status">Finding people to follow…</p>;
 if(error)return <p className="small">Suggested accounts are unavailable. <Link href="/members">Find people</Link></p>;
 if(!data?.members.length)return null;
 return <section className="suggested-accounts"><div className="section-heading"><div><h2>A few people to start with</h2><p className="small">Follow accounts to bring their ratings and reviews to My Home.</p></div><Link href="/members">Find more people →</Link></div><div className="suggested-account-grid">{data.members.map((member:any)=><article className="panel suggested-account" key={member.id}><Link href={'/members/'+member.username}><ProfilePhoto src={member.avatar} name={member.name}/><h3>{member.name}</h3><p>@{member.username}</p></Link><button className={'button '+(followed.includes(member.id)?'secondary':'primary')} disabled={busy.includes(member.id)||followed.includes(member.id)} onClick={()=>follow(member.id,member.username)}>{followed.includes(member.id)?<Check size={16}/>:<Plus size={16}/>} {busy.includes(member.id)?'Following…':followed.includes(member.id)?'Following':'Follow'}</button></article>)}</div>{message&&<p className="notice error" role="alert">{message}</p>}</section>;
}
