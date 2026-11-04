export interface OutlineItem {
  level: number;
  text: string;
  line: number;
  offset: number;
}

const HEADING = /^(#{1,3})\s+(.+?)\s*#*\s*$/u;
const FENCE = /^\s*(```|~~~)/u;

export const outlineOf = (markdown: string): OutlineItem[] => {
  const out: OutlineItem[] = [];
  let fenced = false;
  let offset = 0;
  markdown.split("\n").forEach((raw, line) => {
    if (FENCE.test(raw)) {
      fenced = !fenced;
    }

    const match = fenced ? null : HEADING.exec(raw);

    if (match) {
      const level = match[1]?.length ?? 1;
      const text = (match[2] ?? "").replaceAll(/[*_`]/gu, "");
      out.push({ level, line, offset, text });
    }

    offset += raw.length + 1;
  });

  return out;
};
