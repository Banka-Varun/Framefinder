'use client';
import {useEffect, useRef, useState} from 'react';
import {usernameFromName, usernameSchema} from '@/lib/username';

export default function UsernameField({name, initial = '', onValueChange}: {name: string; initial?: string; onValueChange?: (value: string) => void}) {
  const [value, setValue] = useState(initial || usernameFromName(name));
  const [status, setStatus] = useState('');
  const [suggestion, setSuggestion] = useState('');
  useEffect(() => {onValueChange?.(value);}, [value, onValueChange]);
  const edited = useRef(!!initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!edited.current) setValue(name ? usernameFromName(name) : ''); }, [name]);
  useEffect(() => {
    setStatus(''); setSuggestion(''); input.current?.setCustomValidity('');
    if (!usernameSchema.safeParse(value).success) return;
    if (value === initial) { setStatus('Your current username.'); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('Checking availability…');
      try {
        const response = await fetch('/api/v1/auth/username?' + new URLSearchParams({name, username: value}), {signal: controller.signal});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not check availability.');
        if (controller.signal.aborted) return;
        if (!result.available && !edited.current) { setValue(result.suggestion); return; }
        setStatus(result.available ? 'Available — this will be your @username.' : 'This username is taken.');
        setSuggestion(result.available ? '' : result.suggestion);
        input.current?.setCustomValidity(result.available ? '' : 'Choose an available username.');
      } catch (error) {
        if (!controller.signal.aborted) setStatus('Availability will be checked when you save.');
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, name, initial]);
  return <label>Username
    <input ref={input} name="username" value={value} onChange={e => {edited.current = true; setValue(e.target.value.toLowerCase());}}
      required pattern="[a-z][a-z0-9_]{2,23}" minLength={3} maxLength={24} autoComplete="username" placeholder="varunbanka" spellCheck={false}/>
    <small>3–24 lowercase letters, numbers or underscores. Start with a letter.</small>
    <small role="status">{status}</small>
    {suggestion && <button type="button" className="text-button" onClick={() => setValue(suggestion)}>Use @{suggestion}</button>}
  </label>;
}
