'use client';

import { useActionState } from 'react';
import { importViews } from '../actions';

export function ImportViews() {
  const [state, action, pending] = useActionState(importViews, null);
  if (state?.done) return <p className="adm-msg ok" role="status">{state.done}</p>;
  return (
    <section className="adm-card">
      <h2>Bring over the old site’s page views</h2>
      <form action={action} className="adm-form">
        <p className="mute">Upload the phpMyAdmin export (.sql) with the page_views table. This only works once.</p>
        <input type="file" name="file" accept=".sql,text/plain" required />
        {state?.error && <p className="adm-msg err" role="alert">{state.error}</p>}
        <div><button className="adm-btn" disabled={pending}>{pending ? 'Loading…' : 'Load page views'}</button></div>
      </form>
    </section>
  );
}

