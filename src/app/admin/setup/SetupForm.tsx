'use client';

import { useActionState } from 'react';
import { Mark } from '@/components/Mark';
import { setupAction } from '../actions';

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, null);
  if (state?.lines) return (
    <div className="adm-form" style={{ maxWidth: 640 }}>
      <h1>Almost there</h1>
      <p>Copy <b>all three lines</b>. In Vercel, open the awards project → Settings → Environment Variables → Add New, paste the three lines into the Key field at once (Vercel splits them), tick Production, save, then redeploy. Login stays off until all three are there.</p>
      <textarea readOnly rows={5} value={state.lines} onFocus={(e) => e.currentTarget.select()} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
      <p className="mute">The password itself isn’t stored anywhere. Keep it in your password manager.</p>
    </div>
  );
  return (
    <form action={action} className="adm-form">
      <Mark className="adm-mark adm-mark-l" />
      <h1>Set the admin password</h1>
      <label>Password (12 or more characters)<input type="password" name="password" autoComplete="new-password" minLength={12} required /></label>
      <label>Same password again<input type="password" name="again" autoComplete="new-password" minLength={12} required /></label>
      {state?.error && <p className="adm-msg err" role="alert">{state.error}</p>}
      <button className="adm-btn adm-wide" disabled={pending}>{pending ? 'Working…' : 'Make my settings'}</button>
    </form>
  );
}

