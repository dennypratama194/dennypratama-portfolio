import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { hasDb } from '@/lib/db';
import { Sidebar } from './Sidebar';

export default async function Panel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  // the collapsed state lives in a cookie so the server draws the right width and nothing jumps on load
  const collapsed = (await cookies()).get('dp_side')?.value === '1';
  return (
    <div className="adm-shell" data-collapsed={collapsed || undefined}>
      <Sidebar />
      <main className="adm-main">
        {hasDb ? children : <p className="adm-msg err">DATABASE_URL isn’t set, so there’s nothing to show yet.</p>}
      </main>
    </div>
  );
}

