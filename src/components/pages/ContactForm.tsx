'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EMAIL } from '@/lib/site';
import { NEEDS, WHEN, briefText, type Field } from '@/lib/contact';
import { Arrow } from '../Icons';

const LABEL: Record<Field, string> = { name: 'your name', email: 'a valid email', link: 'a shorter company or link', brief: 'a few lines about the project' };
const PROBLEM: Record<string, string> = {
  limited: 'Too many messages from your connection in the last hour, so this one wasn’t sent.',
  busy: 'The form couldn’t check its spam limit just now, so this one wasn’t sent.',
  unconfigured: 'The form can’t send mail right now, so this one wasn’t sent.',
  send: 'The mail service didn’t take the message, so it wasn’t sent.',
  net: 'Your message couldn’t reach the site, so it wasn’t sent.',
};

type State = { s: 'idle' | 'sending' } | { s: 'invalid'; fields: Field[] } | { s: 'error'; reason: string; mailto: string };

/**
 * A short brief: who, what, and two optional sets of chips. It posts to /api/contact. When that fails it says so
 * and why, keeps what was typed, and offers to try again or to open the visitor's email app with the brief written out.
 */
export function ContactForm() {
  const router = useRouter();
  const [need, setNeed] = useState<string[]>([]);
  const [when, setWhen] = useState('');
  const [state, setState] = useState<State>({ s: 'idle' });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      name: String(f.get('name') ?? ''), email: String(f.get('email') ?? ''), link: String(f.get('link') ?? ''),
      brief: String(f.get('brief') ?? ''), website: String(f.get('website') ?? ''), need, when,
    };
    setState({ s: 'sending' });
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => null);
    if (r?.ok) { router.push('/thanks'); return; }
    const res = await r?.json().catch(() => null);
    if (r?.status === 422 && Array.isArray(res?.fields)) { setState({ s: 'invalid', fields: res.fields }); return; }
    const body = [briefText(data), data.name].filter(Boolean).join('\n\n');
    const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(`New brief from ${data.name}`)}&body=${encodeURIComponent(body)}`;
    setState({ s: 'error', reason: r ? (res?.reason ?? 'send') : 'net', mailto });
  };

  const toggle = (n: string) => setNeed((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  return (
    <form className="cf" onSubmit={submit}>
      <div className="cf-row">
        <label className="fld"><span className="mono">Name</span><input name="name" required autoComplete="name" placeholder="Your name" /></label>
        <label className="fld"><span className="mono">Email</span><input name="email" type="email" required autoComplete="email" placeholder="you@company.com" /></label>
      </div>
      <label className="fld"><span className="mono">Company or link <em>(optional)</em></span><input name="link" autoComplete="url" placeholder="Company name, site or Figma link" /></label>
      <label className="fld"><span className="mono">What are you working on?</span><textarea name="brief" required rows={4} placeholder="A few lines is enough: the product, who it’s for, and what you need from me." /></label>
      <fieldset className="cf-set">
        <legend className="mono">What do you need? <em>(optional)</em></legend>
        <div className="chips">{NEEDS.map((n) => <button type="button" key={n} className={`chip${need.includes(n) ? ' on' : ''}`} aria-pressed={need.includes(n)} onClick={() => toggle(n)} data-cursor="link">{n}</button>)}</div>
      </fieldset>
      <fieldset className="cf-set">
        <legend className="mono">When? <em>(optional)</em></legend>
        <div className="chips">{WHEN.map((n) => <button type="button" key={n} className={`chip${when === n ? ' on' : ''}`} aria-pressed={when === n} onClick={() => setWhen(when === n ? '' : n)} data-cursor="link">{n}</button>)}</div>
      </fieldset>
      <label className="cf-hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="cf-go">
        <button className="btn btn-ink" type="submit" disabled={state.s === 'sending'} data-cursor="link">
          {state.s === 'sending' ? 'Sending…' : state.s === 'error' ? 'Try again' : 'Send the brief'}<Arrow />
        </button>
        {state.s !== 'error' && <p className="mono mute">Or email {EMAIL}</p>}
      </div>
      <div aria-live="polite">
        {state.s === 'invalid' && (
          <p className="cf-err" role="alert">Please add {state.fields.map((x) => LABEL[x] ?? x).join(', ')}.</p>
        )}
        {state.s === 'error' && (
          <div className="cf-err" role="alert">
            <p>{PROBLEM[state.reason] ?? PROBLEM.send} What you wrote is still here.</p>
            <p>{state.reason === 'limited' ? 'Try again in an hour' : 'Try again in a moment'}, or send it to {EMAIL} from your email app, with the brief already filled in.</p>
            <a className="btn btn-line" href={state.mailto} data-cursor="link">Open in my email app<Arrow /></a>
          </div>
        )}
      </div>
    </form>
  );
}

