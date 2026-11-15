interface RuleBody {
  readonly end: number;
  readonly prelude: string;
  readonly start: number;
}

interface RuleScan {
  bodyStart: number;
  depth: number;
  prelude: string;
  preludeStart: number;
}

interface RuleValueDone {
  readonly code: string;
  readonly ok: true;
}

interface RuleValueRefused {
  readonly code: "rule_not_found" | "property_not_found";
  readonly ok: false;
}

type RuleValueResult = RuleValueDone | RuleValueRefused;

type RuleStyle = Readonly<Record<string, string | null>>;

const COMBINATORS = [">", "+", "~", ","];

const STYLE_OPEN = ["<", "style"].join("");

const STYLE_CLOSE = "</style>";

const toSelectorKey = (selector: string): string => {
  let key = selector.trim().split(/\s+/u).join(" ");

  for (const mark of COMBINATORS) {
    key = key.replaceAll(` ${mark}`, mark).replaceAll(`${mark} `, mark);
  }

  return key;
};

const toCommentEnd = (text: string, index: number): number => {
  const end = text.indexOf("*/", index + 2);

  if (end === -1) {
    return text.length;
  }

  return end + 1;
};

const updateRuleScan = (
  scan: RuleScan,
  text: string,
  index: number,
  out: RuleBody[]
): void => {
  const char = text[index];

  if (char === "{" && scan.depth === 0) {
    scan.prelude = text.slice(scan.preludeStart, index);
    scan.bodyStart = index + 1;
  }

  if (char === "{") {
    scan.depth += 1;
  }

  if (char === "}" && scan.depth > 0) {
    scan.depth -= 1;
  }

  const isClosed = char === "}" && scan.depth === 0;

  if (isClosed) {
    out.push({ end: index, prelude: scan.prelude, start: scan.bodyStart });
  }

  if (isClosed || (char === ";" && scan.depth === 0)) {
    scan.preludeStart = index + 1;
  }
};

const toRuleBodies = (text: string): RuleBody[] => {
  const out: RuleBody[] = [];

  const scan: RuleScan = {
    bodyStart: 0,
    depth: 0,
    prelude: "",
    preludeStart: 0,
  };

  let index = 0;

  while (index < text.length) {
    if (text.startsWith("/*", index)) {
      index = toCommentEnd(text, index);
    } else {
      updateRuleScan(scan, text, index, out);
    }

    index += 1;
  }

  return out;
};

const toLeadSpace = (text: string): string =>
  text.slice(0, text.length - text.trimStart().length);

const toTailSpace = (text: string): string => text.slice(text.trimEnd().length);

const toNewChunk = (chunk: string, style: RuleStyle): string => {
  const colon = chunk.indexOf(":");

  if (colon === -1) {
    return chunk;
  }

  const prop = chunk.slice(0, colon).trim().toLowerCase();
  const value = style[prop] ?? null;

  if (value === null) {
    return chunk;
  }

  const old = chunk.slice(colon + 1);

  return `${chunk.slice(0, colon + 1)}${toLeadSpace(old)}${value}${toTailSpace(old)}`;
};

const hasEveryProp = (chunks: readonly string[], style: RuleStyle): boolean => {
  const props = new Set(
    chunks.map((chunk) => chunk.split(":")[0]?.trim().toLowerCase() ?? "")
  );

  return Object.entries(style).every(
    ([prop, value]) => value === null || props.has(prop)
  );
};

const toCssRuleValue = (
  text: string,
  selector: string,
  style: RuleStyle
): RuleValueResult => {
  const key = toSelectorKey(selector);

  const rule = toRuleBodies(text).find(
    (body) => toSelectorKey(body.prelude) === key
  );

  if (!rule) {
    return { code: "rule_not_found", ok: false };
  }

  const chunks = text.slice(rule.start, rule.end).split(";");

  if (!hasEveryProp(chunks, style)) {
    return { code: "property_not_found", ok: false };
  }

  const body = chunks.map((chunk) => toNewChunk(chunk, style)).join(";");

  return {
    code: `${text.slice(0, rule.start)}${body}${text.slice(rule.end)}`,
    ok: true,
  };
};

const toStyleBlockRuleValue = (
  html: string,
  selector: string,
  style: RuleStyle
): RuleValueResult => {
  let from = html.toLowerCase().indexOf(STYLE_OPEN);

  while (from !== -1) {
    const start = html.indexOf(">", from) + 1;
    const end = html.toLowerCase().indexOf(STYLE_CLOSE, start);

    if (start === 0 || end === -1) {
      break;
    }

    const next = toCssRuleValue(html.slice(start, end), selector, style);

    if (next.ok) {
      return {
        code: `${html.slice(0, start)}${next.code}${html.slice(end)}`,
        ok: true,
      };
    }

    from = html.toLowerCase().indexOf(STYLE_OPEN, end);
  }

  return { code: "rule_not_found", ok: false };
};

export { toCssRuleValue, toStyleBlockRuleValue };

export type { RuleValueResult };
