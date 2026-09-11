'use client';
import Link from './app-link';
import {MovieArtwork} from './movie-picker';
export default function TicketListingRow({ticket:t}:{ticket:any}){return <Link className="exchange-ticket-card" href={'/tickets/'+t.id}><div className="exchange-ticket-art"><MovieArtwork title={t.movie}/></div><div className="exchange-ticket-copy"><h2 title={t.movie}>{t.movie}</h2><p className="exchange-theater" title={t.theater}>{t.theater}</p><p>{new Date(t.show_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST</p><p>{t.language} · {t.format} · {t.quantity} ticket{t.quantity===1?'':'s'}</p><div className="ticket-perforation"/><div className="exchange-ticket-action"><strong>₹{(t.price/100).toFixed(2)}</strong><span>Open →</span></div></div></Link>;}
