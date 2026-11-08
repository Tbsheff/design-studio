interface OutlineItem {
  level: number;
  line: number;
  offset: number;
  text: string;
}

interface Heading {
  level: number;
  text: string;
}

const MAX_LEVEL = 3;
const LEADING_SPACE = /^\s/u;

const isFence = (raw: string): boolean => {
  const start = raw.trimStart();

  return start.startsWith("```") || start.startsWith("~~~");
};

const stripTrailingHashes = (text: string): string => {
  let end = text.length;

  while (end > 0 && text.charAt(end - 1) === "#") {
    end -= 1;
  }

  return text.slice(0, end);
};

const toLevel = (raw: string): number => {
  let level = 0;

  while (raw.charAt(level) === "#") {
    level += 1;
  }

  return level;
};

const toHeading = (raw: string): Heading | null => {
  const level = toLevel(raw);
  const rest = raw.slice(level);

  if (level < 1 || level > MAX_LEVEL || !LEADING_SPACE.test(rest)) {
    return null;
  }

  const text = stripTrailingHashes(rest.trim()).trim();

  if (text === "") {
    return null;
  }

  return { level, text: text.replaceAll(/[*_`]/gu, "") };
};

const outlineOf = (markdown: string): OutlineItem[] => {
  const out: OutlineItem[] = [];
  let isFenced = false;
  let offset = 0;

  for (const [line, raw] of markdown.split("\n").entries()) {
    if (isFence(raw)) {
      isFenced = !isFenced;
    }

    const heading = toHeading(raw);

    if (heading && !isFenced) {
      const { level, text } = heading;

      out.push({ level, line, offset, text });
    }

    offset += raw.length + 1;
  }

  return out;
};

export { outlineOf };

export type { OutlineItem };
