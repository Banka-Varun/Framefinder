'use client';
import {Film, Users, ArrowRight} from 'lucide-react';
import Link from './app-link';
import {useLoad} from './client-data';
import {MovieArtwork} from './movie-picker';

export default function HomeFeed({name}: {name: string}) {
  const {data, error} = useLoad('feed');
  return <section className="section home-feed"><p className="eyebrow">FROM YOUR FILM PEOPLE</p><div className="section-heading"><div><h1>Welcome back, {name.split(' ')[0]}.</h1><p className="lede">Recent watches, ratings and reviews from people you follow.</p></div><Link href="/for-you" className="button secondary">Your film picks <ArrowRight size={17}/></Link></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading your home feed…</p>}
    {data?.activity?.length ? <div className="activity-list">{data.activity.map((item: any) => <article className="panel activity-card" key={item.key}><MovieArtwork title={item.movie.title}/><div><p className="small"><Link href={'/members/' + item.username}>@{item.username}</Link> · {new Date(item.updated_at).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}</p><Link href={'/films/' + item.movie.id}><h2>{item.movie.title}</h2></Link><p className="activity-state">{item.rating ? `${item.rating / 2} / 5 ★` : item.watched ? 'Watched' : item.liked ? 'Liked' : 'Reviewed'}</p>{item.review && (item.spoiler ? <details><summary>Read spoiler review</summary><p>{item.review}</p></details> : <p>{item.review}</p>)}</div></article>)}</div> : data && <div className="panel feed-empty"><Users size={32}/><h2>Your people make this page.</h2><p>Follow members to see their recent film activity here. For You already has recommendations based on your taste.</p><div className="actions"><Link href="/members" className="button primary">Find members</Link><Link href="/for-you" className="button secondary"><Film size={17}/>Explore your picks</Link></div></div>}
  </section>;
}
