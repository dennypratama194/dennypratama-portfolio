import { SOCIAL } from '@/lib/site';

export function Social({ className = 'soc mono' }: { className?: string }) {
  return (
    <ul className={className}>
      {SOCIAL.map((s) => (
        <li key={s.name}>
          <a href={s.href} target="_blank" rel="noopener" data-cursor="link">{s.name}</a>
        </li>
      ))}
    </ul>
  );
}

