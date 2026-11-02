import Link from 'next/link';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/autopost';
import { saveAutoSettings } from '../../actions';
import { RunNow } from './RunNow';
import { requireAdmin } from '@/lib/auth';

// "Write one now" runs in this page's function, and a post can take a few minutes
export const maxDuration = 300;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const when = (d: Date) => d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

export default async function AutoPost() {
  await requireAdmin();
  const s = await getSettings();
  const runs = await db()<{ id: number; started_at: Date; ok: boolean | null; post_id: number | null; message: string | null; raw: string | null }[]>`
    SELECT id, started_at, ok, post_id, message, raw FROM auto_post_runs ORDER BY id DESC LIMIT 20`;
  const keyMissing = !process.env.ANTHROPIC_API_KEY;
  return (
    <>
      <header className="adm-head"><h1>Auto-post</h1><RunNow disabled={keyMissing} /></header>
      {keyMissing && <p className="adm-msg err">ANTHROPIC_API_KEY isn’t set in Vercel, so auto-post can’t write anything yet.</p>}
      <section className="adm-card">
        <h2>Schedule</h2>
        <form action={saveAutoSettings} className="adm-form">
          <label className="adm-check"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Write a post automatically</label>
          <fieldset className="adm-days" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="mute" style={{ marginBottom: 8 }}>On these days, around 08:00 Jakarta time</legend>
            {DAYS.map((d, i) => <label key={d} className="adm-check"><input type="checkbox" name="days" value={i} defaultChecked={s.days.includes(i)} /> {d}</label>)}
          </fieldset>
          <label className="adm-check"><input type="checkbox" name="publish" defaultChecked={s.publish} /> Publish straight away (otherwise each post waits as a draft for you to read first)</label>
          <div><button className="adm-btn">Save schedule</button></div>
        </form>
      </section>
      <section className="adm-card">
        <h2>Recent runs</h2>
        {runs.length === 0 ? <p className="mute">No runs yet.</p> : (
          <table className="adm-tbl">
            <thead><tr><th>When</th><th>Result</th></tr></thead>
            <tbody>{runs.map((r) => (
              <tr key={r.id}>
                <td className="mute" style={{ whiteSpace: 'nowrap' }}>{when(r.started_at)}</td>
                <td>
                  <span className={`adm-pill ${r.ok ? 'live' : ''}`}>{r.ok === null ? 'running or stopped' : r.ok ? 'done' : 'failed'}</span>{' '}
                  {r.post_id ? <Link href={`/admin/posts/${r.post_id}`}>{r.message}</Link> : r.message}
                  {r.raw && <details><summary className="mute">What the model returned</summary><pre>{r.raw}</pre></details>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </>
  );
}

