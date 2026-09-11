'use client';
import ShowCountdown from './show-countdown';
import Link from './app-link';
import {MovieArtwork} from './movie-picker';
import {ticketStatus} from '@/lib/ticket-status';
export default function TicketListingRow({ticket:t}:{ticket:any}){const status=ticketStatus(t.status,t.review_decision);return <Link className="exchange-ticket-card" href={'/tickets/'+t.id}><div className="exchange-ticket-art"><MovieArtwork title={t.movie}/></div><div className="exchange-ticket-copy"><span className={'tag'+(status.approved?' approved-status':'')}>{status.label}</span><h2>{t.movie}</h2><p className="exchange-theater">{t.theater}</p><p>{new Date(t.show_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST</p><p>{t.format} · {t.quantity} ticket{t.quantity===1?'':'s'}</p>{t.status==='pending_verification'&&t.review_decision==='approved'&&<small>Issuer verification pending</small>}<ShowCountdown showAt={t.show_at}/><div className="ticket-perforation"/><div className="exchange-ticket-action"><strong>₹{(t.price/100).toFixed(2)}</strong><span>Open →</span></div></div></Link>;}
