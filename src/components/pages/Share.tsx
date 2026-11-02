'use client';

import { useState } from 'react';

export function Share({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => window.location.href;
  const open = (u: string) => window.open(u, '_blank', 'noopener');
  return (
    <div className="share">
      <button className="chip" type="button" data-cursor="link" onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url())}`)}>LinkedIn</button>
      <button className="chip" type="button" data-cursor="link" onClick={() => open(`https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url()}`)}`)}>Threads</button>
      <button
        className="chip"
        type="button"
        data-cursor="link"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url()); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

