'use client';
import {Film,ArrowRight,Bell,Users} from 'lucide-react';
import Link from './app-link';
import {useLoad} from './client-data';
import TicketIcon from './ticket-icon';
import FilmActivity, {type FilmActivityItem} from './film-activity';

export default function HomeFeed({name}:{name:string}) {
  const {data,error}=useLoad('home');
  return <section className="section home-feed">
    <p className="eyebrow">MY HOME</p>
    <div className="section-heading"><div><h1>Welcome back, {name.split(' ')[0]}.</h1><p className="lede">See what your film people have been watching.</p></div><Link href="/for-you" className="button secondary">Find your next film <ArrowRight size={17}/></Link></div>
    <div className="home-shortcuts">
      <Link className="panel" href="/booking-alerts"><Bell/><h2>Booking Alerts</h2><p>Upcoming shows and unblocked seats</p></Link>
      <Link className="panel" href="/tickets"><TicketIcon/><h2>Ticket Exchange</h2><p>Browse available tickets</p></Link>
      <Link className="panel" href="/my-list"><Film/><h2>My List</h2><p>Your saved films</p></Link>
    </div>
    <div className="section-heading"><div><h2>Recently rated by people you follow</h2><p className="small">Their latest ratings and reviews, all in one place.</p></div><Link href="/members" className="button secondary"><Users size={17}/> Find people</Link></div>
    {error&&<p className="notice error" role="alert">{error}</p>}
    {!data&&!error&&<p role="status">Loading recent reviews…</p>}
    {data?.activity?.length ? <div className="activity-list">{data.activity.map((item:FilmActivityItem & {key:string})=><FilmActivity key={item.key} item={item}/>)}</div> : data && <div className="panel feed-empty"><Users/><h2>Find your film people.</h2><p>Follow members to see their latest ratings and reviews here.</p><Link className="button primary" href="/members">Discover members</Link></div>}
  </section>;
}
