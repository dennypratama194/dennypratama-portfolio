import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { authConfigured } from '@/lib/auth';
import { SetupForm } from './SetupForm';

/**
 * First-time setup: turns a password into the env values Denny pastes into Vercel. It sets nothing itself, so
 * whoever opens it can't take over the admin, and it closes for good once ADMIN_PASSWORD_HASH is set.
 */
export default async function Setup() {
  await connection(); // read the env at request time, not at build
  if (authConfigured()) redirect('/admin/login');
  return <main className="adm-login"><SetupForm /></main>;
}

