'use client';
import {useEffect, useRef, useState} from 'react';
import {MoreHorizontal, Bell, Eye, Sparkles, Bookmark, Users, HelpCircle, Flag, Info, Mail, Share2, Star, FileText, Shield} from 'lucide-react';
import Link from './app-link';

export default function MoreMenu({route}: {route: string}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copyUrl, setCopyUrl] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {setOpen(false); setMessage(''); setCopyUrl('');}, [route]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {if (!root.current?.contains(event.target as Node)) setOpen(false);};
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') {setOpen(false); trigger.current?.focus();}};
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => {document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape);};
  }, [open]);
  async function share() {
    const url = location.origin + '/';
    setMessage('');
    if (navigator.share) {
      try {await navigator.share({title: 'FrameFinder', text: 'Find your next film and your film people.', url}); return;}
      catch (error) {if ((error as Error).name === 'AbortError') return;}
    }
    try {await navigator.clipboard.writeText(url); setMessage('Link copied.');}
    catch {setCopyUrl(url); setMessage('Copy this link to share FrameFinder.');}
  }
  const groups = [
    {label: 'Explore', links: [['tonight', 'Tonight’s Pick', Sparkles], ['my-list', 'My List', Bookmark], ['booking-alerts', 'Booking Alerts', Bell], ['seat-alerts', 'Unblocked Seats', Eye], ['members', 'Members', Users]]},
    {label: 'Help & feedback', links: [['help', 'Help & FAQs', HelpCircle], ['report', 'Report a Problem', Flag], ['contact', 'Contact Us', Mail], ['rate', 'Rate FrameFinder', Star]]},
    {label: 'FrameFinder', links: [['about', 'About Us', Info], ['terms', 'Terms & Conditions', FileText], ['privacy', 'Privacy Policy', Shield]]},
  ] as const;
  return <div ref={root} className="more-menu" onBlur={e => {if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);}}>
    <button ref={trigger} type="button" className="icon-button more-trigger" aria-label="More options" aria-expanded={open} aria-controls="more-options" onClick={() => setOpen(!open)}><MoreHorizontal size={24}/></button>
    {open && <nav id="more-options" className="more-panel" aria-label="More options">
      {groups.map(group => <div className="more-group" key={group.label}><p>{group.label}</p>{group.links.map(([href, label, Icon]) => <Link key={href} href={'/' + href} aria-current={route === href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={17}/>{label}</Link>)}</div>)}
      <button type="button" className="share-action" onClick={share}><Share2 size={17}/>Share FrameFinder</button>
      {message && <p className="menu-status" role="status">{message}</p>}
      {copyUrl && <input aria-label="Link to share" value={copyUrl} readOnly onFocus={e => e.target.select()}/>}
    </nav>}
  </div>;
}
