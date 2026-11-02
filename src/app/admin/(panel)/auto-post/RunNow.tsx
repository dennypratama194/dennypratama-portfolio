'use client';

import { useFormStatus } from 'react-dom';
import { runNow } from '../../actions';

function Button({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button className="adm-btn" disabled={disabled || pending}>{pending ? 'Writing… (up to a few minutes)' : 'Write one now'}</button>;
}

export function RunNow({ disabled }: { disabled: boolean }) {
  return <form action={runNow}><Button disabled={disabled} /></form>;
}

