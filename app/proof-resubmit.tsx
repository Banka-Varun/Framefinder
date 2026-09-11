'use client';
import {useState,type FormEvent} from 'react';
import {api} from './client-data';
export default function ProofResubmit({ticketId,onSaved}:{ticketId:string;onSaved:()=>void}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');try{const form=new FormData(event.currentTarget),file=form.get('proof') as File;if(!file?.size||file.size>4*1024*1024)throw new Error('Choose a JPG, PNG or WebP image under 4 MB.');form.set('kind','proof');const response=await fetch('/api/v1/assets',{method:'POST',body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'Upload failed.');await api('tickets/'+ticketId+'/proof',{proofId:data.id});onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <form className="proof-resubmit" onSubmit={submit}><h2>Upload corrected proof</h2><p>Follow the review instructions above. Your replacement goes back to the admin review queue.</p><label>New booking proof<input name="proof" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy}/></label><button className="button primary" disabled={busy}>{busy?'Submitting…':'Re-submit for review'}</button>{error&&<p role="alert" className="notice error">{error}</p>}</form>;
}
