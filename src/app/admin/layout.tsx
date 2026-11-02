import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { connection } from 'next/server';
import '@/styles/admin.css';

// the admin is a tool, so it reads in a tool face; the public site keeps Archivo
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection(); // admin framework scripts receive the per-request CSP nonce
  return <div className={`adm ${geist.variable}`}>{children}</div>;
}

