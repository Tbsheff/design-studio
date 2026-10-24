export interface OutlineItem {
  level: number;
  text: string;
  line: number;
  offset: number;
}

const HEADING = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

export function outlineOf(markdown: string): OutlineItem[] {
  const out: OutlineItem[] = [];
  let fenced = false;
  let offset = 0;
  markdown.split('\n').forEach((raw, line) => {
    if (FENCE.test(raw)) fenced = !fenced;
    const match = fenced ? null : HEADING.exec(raw);
    if (match) out.push({ level: match[1]?.length ?? 1, text: (match[2] ?? '').replace(/[*_`]/g, ''), line, offset });
    offset += raw.length + 1;
  });
  return out;
}
