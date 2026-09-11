'use client';
import {useEffect, useRef, useState} from 'react';
import {Menu, X, Home, Compass, Film, Ticket, MessageCircle, Bell, Eye, Sparkles, Bookmark, Users, HelpCircle, Flag, Info, Mail, Share2, Star, FileText, Shield} from 'lucide-react';
import Link from './app-link';

export default function MoreMenu({route, signedIn}: {route: string; signedIn: boolean}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copyUrl, setCopyUrl] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {setOpen(false); setMessage(''); setCopyUrl('');}, [route]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {if (element.open) element.close(); return;}
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {document.body.style.overflow = previousOverflow; if (element.open) element.close();};
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
    {label: 'Explore', links: [['tonight', 'Tonight’s Pick', Sparkles], ['my-list', 'My List', Bookmark], ['booking-alerts', 'Booking Alerts', Bell], ['subscriptions', 'Alert Plans', Ticket], ['seat-alerts', 'Unblocked Seats', Eye], ['members', 'Members', Users]]},
    {label: 'Help & feedback', links: [['help', 'FAQs', HelpCircle], ['report', 'Report a Problem', Flag], ['contact', 'Contact Us', Mail], ['rate', 'Rate Us', Star]]},
    {label: 'FrameFinder', links: [['about', 'About Us', Info], ['terms', 'Terms & Conditions', FileText], ['privacy', 'Privacy Policy', Shield]]},
  ] as const;
  return <>
    <button ref={trigger} type="button" className="menu-trigger" aria-label="Open menu" aria-expanded={open} aria-controls="site-menu" aria-haspopup="dialog" onClick={() => setOpen(true)}><Menu size={23}/><span>Menu</span></button>
    <dialog ref={dialog} id="site-menu" className="site-drawer" aria-labelledby="site-menu-title" onClose={() => {setOpen(false); trigger.current?.focus();}} onClick={e => {
      if (e.target !== e.currentTarget) return;
      const box = e.currentTarget.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) setOpen(false);
    }}>
      <div className="drawer-heading"><h2 id="site-menu-title">Menu</h2><button type="button" className="drawer-close" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus><X size={22}/></button></div>
      <nav aria-label="Site menu" className="drawer-links">
        {groups.map(group => <div className="drawer-group" key={group.label}><p>{group.label}</p>{group.links.map(([href, label, Icon]) => <Link key={href} href={'/' + href} aria-current={route.split('/')[0] === href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18}/>{label}</Link>)}</div>)}
        <button type="button" className="drawer-share" onClick={share}><Share2 size={18}/>Share FrameFinder</button>
        {message && <p className="menu-status" role="status">{message}</p>}
        {copyUrl && <input aria-label="Link to share" value={copyUrl} readOnly onFocus={e => e.target.select()}/>}
        {!signedIn && <div className="drawer-account"><Link className="button primary" href="/signup" onClick={() => setOpen(false)}>Create account</Link><Link href="/login" onClick={() => setOpen(false)}>Sign in</Link></div>}
      </nav>
    </dialog>
  </>;
}
