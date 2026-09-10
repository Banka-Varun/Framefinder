'use client';
import {useState} from 'react';
import {api} from './client-data';
import Link from './app-link';
import AdminPanel from './admin-panel';
export default function AdminAccess(){const[verified,setVerified]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');async function verify(){setBusy(true);setError('');try{await api('admin/access',{});setVerified(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}if(verified)return <AdminPanel/>;return <section className="section"><p className="eyebrow">RESTRICTED ACCESS</p><h1>Are you an administrator?</h1><div className="panel"><p>Verify that your signed-in account has administrator access to continue.</p><button className="button primary" onClick={verify} disabled={busy}>{busy?'Checking access…':'Verify administrator access'}</button>{error&&<p className="notice error" role="alert">{error}</p>}<p><Link href="/for-you">Return home</Link></p></div></section>;}
