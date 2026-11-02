import { redirect } from 'next/navigation';
import { authConfigured, isAdmin } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function Login() {
  if (await isAdmin()) redirect('/admin');
  return (
    <main className="adm-login">
      <LoginForm off={!authConfigured()} />
    </main>
  );
}

