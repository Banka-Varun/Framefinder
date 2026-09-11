'use client';
import {useSession} from './session-provider';
import Link from './app-link';
import AdminPanel from './admin-panel';
export default function AdminAccess({section='',recipientId=''}:{section?:string;recipientId?:string}){const{data,error}=useSession();if(!data)return <p role="status">{error||'Checking your account…'}</p>;if(!data.user?.admin)return <section className="section"><h1>Administrator access required</h1><p>Sign in with your administrator account.</p><Link href="/login">Sign in</Link></section>;return <AdminPanel section={section} recipientId={recipientId}/>;}
