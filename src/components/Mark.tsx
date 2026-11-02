import { D_PATH, MARK_VB, P_PATH } from '@/lib/site';

export function Mark({ className = 'dpm' }: { className?: string }) {
  return (
    <svg className={className} viewBox={MARK_VB} aria-hidden="true">
      <path d={D_PATH} />
      <path d={P_PATH} />
    </svg>
  );
}

