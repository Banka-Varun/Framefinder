'use client';
import {Film, Heart} from 'lucide-react';
import {useState} from 'react';
import Link from './app-link';
import ProfilePhoto from './profile-photo';
import type {Film as FilmType} from '@/server/catalog';

export type FilmActivityItem = {
  movie: FilmType; rating: number | null; review: string; spoiler: number;
  watched: number; liked: number; watched_on?: string | null; updated_at: string;
  username?: string; name?: string; avatar?: string;
};

export default function FilmActivity({item}: {item: FilmActivityItem}) {
  const [failed, setFailed] = useState(false);
  const date = new Date(item.watched_on || item.updated_at);
  return <article className="panel activity-card">
    <Link href={'/films/' + item.movie.id} className="activity-poster" aria-label={item.movie.title}>
      {item.movie.poster && !failed ? <img src={item.movie.poster} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <Film aria-hidden="true"/>}
    </Link>
    <div className="activity-content">
      {item.username && <Link className="activity-author" href={'/members/' + item.username}>
        <ProfilePhoto name={item.name || item.username} src={item.avatar}/>
        <span><strong>{item.name || item.username}</strong><small>@{item.username}</small></span>
      </Link>}
      <p className="small">{item.watched_on ? 'Watched ' : ''}<time dateTime={item.watched_on || item.updated_at}>{date.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'})}</time></p>
      <Link href={'/films/' + item.movie.id}><h2>{item.movie.title} <small>{item.movie.year || ''}</small></h2></Link>
      <div className="activity-state">
        {item.rating != null ? <span aria-label={item.rating / 2 + ' out of 5 stars'}>★ {item.rating / 2} / 5</span> : item.watched ? <span>Watched · Not rated yet</span> : null}
        {!!item.liked && <span className="activity-loved"><Heart size={15} fill="currentColor" aria-hidden="true"/> Loved</span>}
      </div>
      {!!item.review && (item.spoiler ? <details><summary>Read review · Contains spoilers</summary><p>{item.review}</p></details> : <p>{item.review}</p>)}
    </div>
  </article>;
}
