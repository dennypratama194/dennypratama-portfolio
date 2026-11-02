/** A tiny CSS highlighter: comments go muted, selectors and at-rule names go red. Enough for the snippets on this site. */
export function highlight(src: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const k = (s: string) => `<span class="k">${esc(s)}</span>`;
  return src
    .split('\n')
    .map((line) => {
      const com = line.match(/^(\s*)(\/\*.*\*\/)\s*$/);
      if (com) return `${com[1]}<span class="c">${esc(com[2])}</span>`;
      const rule = line.match(/^(\s*)([^{}\s][^{}]*?)(\s*\{.*)$/);
      if (!rule) return esc(line);
      const [, ind, sel, rest] = rule;
      const at = sel.match(/^(@[\w-]+)(.*)$/);
      return ind + (at ? k(at[1]) + esc(at[2]) : k(sel)) + esc(rest);
    })
    .join('\n');
}

export function Code({ src }: { src: string }) {
  return <pre className="code" dangerouslySetInnerHTML={{ __html: highlight(src) }} />;
}

