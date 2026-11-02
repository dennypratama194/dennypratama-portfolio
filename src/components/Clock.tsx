'use client';

import { useEffect, useState } from 'react';

const fmt = () => {
  try {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
};

/** Local time in Indonesia (WIB), refreshed every 30 seconds. */
export function Clock() {
  const [t, setT] = useState('00:00');
  useEffect(() => {
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 30000);
    return () => clearInterval(id);
  }, []);
  return <time suppressHydrationWarning>{t}</time>;
}

