'use client';

import { useActionState } from 'react';
import { Mark } from '@/components/Mark';
import { loginAction } from '../actions';

export function LoginForm({ off }: { off: boolean }) {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="adm-form">
      <Mark className="adm-mark adm-mark-l" />
      <h1>Admin</h1>
      {off && <p className="adm-msg err">Login isn’t set up yet. <a href="/admin/setup">Set the admin password</a> first.</p>}
      <label>Password<input type="password" name="password" autoComplete="current-password" required autoFocus /></label>
      {error && <p className="adm-msg err" role="alert">{error}</p>}
      <button className="adm-btn adm-wide" disabled={pending || off}>{pending ? 'Checking…' : 'Log in'}</button>
    </form>
  );
}

