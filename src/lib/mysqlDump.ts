/** Reads the rows of one table from a phpMyAdmin SQL export (its INSERT INTO ... VALUES statements). */
const ESC: Record<string, string> = { 0: '\0', b: '\b', n: '\n', r: '\r', t: '\t', Z: '\x1a' };

export function rowsOf(dump: string, table: string) {
  const out: Record<string, string | number | null>[] = [];
  const re = new RegExp('INSERT INTO `' + table + '` \\(([^)]*)\\) VALUES\\s*', 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(dump))) {
    const cols = m[1].split(',').map((c) => c.trim().replace(/`/g, ''));
    let i = re.lastIndex;
    for (;;) {
      while (/[\s,]/.test(dump[i] ?? '')) i++;
      if (dump[i] !== '(') break;
      i++;
      const vals: (string | number | null)[] = [];
      for (;;) {
        while (dump[i] === ' ' || dump[i] === '\n') i++;
        if (dump[i] === "'") {
          let s = '';
          for (i++; i < dump.length; i++) {
            const c = dump[i];
            if (c === '\\') { i++; s += ESC[dump[i]] ?? dump[i]; }
            else if (c === "'" && dump[i + 1] === "'") { s += "'"; i++; }
            else if (c === "'") { i++; break; }
            else s += c;
          }
          vals.push(s);
        } else {
          let j = i;
          while (j < dump.length && dump[j] !== ',' && dump[j] !== ')') j++;
          const raw = dump.slice(i, j).trim();
          vals.push(raw === 'NULL' ? null : Number(raw));
          i = j;
        }
        while (dump[i] === ' ') i++;
        if (dump[i] === ',') { i++; continue; }
        if (dump[i] === ')') { i++; break; }
        throw new Error('This file doesn’t look like a phpMyAdmin SQL export.');
      }
      out.push(Object.fromEntries(cols.map((c, k) => [c, vals[k]])));
      while (dump[i] === ' ' || dump[i] === '\n' || dump[i] === '\r') i++;
      if (dump[i] === ';') break;
    }
    re.lastIndex = i;
  }
  return out;
}

