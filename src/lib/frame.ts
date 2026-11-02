import { gsap } from 'gsap';

type Job = { read?: () => void; write?: () => void };

const jobs: Job[] = [];
const pending: (() => void)[] = [];
let running = false;
let height = 0;

// Every reader measures first, then every writer writes. A read after a write forces the browser to recalculate
// style and layout on the spot, so effects that each read-then-write on their own lay the page out once per effect,
// every frame. Batched, the reads all see the layout the last frame already paid for.
function run() {
  height = window.innerHeight;
  for (let i = 0; i < jobs.length; i++) jobs[i].read?.();
  for (let i = 0; i < jobs.length; i++) jobs[i].write?.();
  if (pending.length) pending.splice(0).forEach((f) => f());
  if (!jobs.length && !pending.length) {
    gsap.ticker.remove(run);
    running = false;
  }
}

/** Per-frame work on the shared GSAP clock, split into a measuring half and a writing half. Returns a remover. */
export function onFrame(read: (() => void) | undefined, write: (() => void) | undefined) {
  const job = { read, write };
  jobs.push(job);
  if (!running) {
    running = true;
    gsap.ticker.add(run);
  }
  return () => {
    const i = jobs.indexOf(job);
    if (i >= 0) jobs.splice(i, 1);
  };
}

/**
 * The viewport height, read once at the top of the frame. On phones window.innerHeight itself forces a full layout
 * when anything has been written, so the writing half must never touch it.
 */
export const viewH = () => height || window.innerHeight;

/** Runs a write in this frame's writing half (or the next frame's, when called outside the clock). */
export function deferWrite(f: () => void) {
  pending.push(f);
  if (!running) {
    running = true;
    gsap.ticker.add(run);
  }
}

const last = new WeakMap<HTMLElement, Record<string, string>>();

/** Sets a custom property only when its text changes, so a resting section stops invalidating style every frame. */
export function setVar(el: HTMLElement, name: string, value: string | null) {
  let m = last.get(el);
  if (!m) last.set(el, (m = {}));
  if (m[name] === (value ?? '')) return;
  m[name] = value ?? '';
  if (value === null) el.style.removeProperty(name);
  else el.style.setProperty(name, value);
}

