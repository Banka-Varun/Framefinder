'use client';
import Link from './app-link';
import {MovieArtwork} from './movie-picker';
export default function TicketListingRow({ticket:t}:{ticket:any}){return <Link className="compact-movie-row" href={'/tickets/'+t.id}><MovieArtwork title={t.movie}/><div className="compact-copy"><h2>{t.movie}</h2><p>{t.theater}</p><p>{new Date(t.show_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST · {t.format} · {t.quantity} ticket{t.quantity===1?'':'s'}</p><span className="tag">{t.status==='pending_verification'?'Unverified · enquiries only':t.status.replaceAll('_',' ')}</span></div><div className="compact-end"><strong>₹{(t.price/100).toFixed(2)}</strong><span>Open →</span></div></Link>;}
