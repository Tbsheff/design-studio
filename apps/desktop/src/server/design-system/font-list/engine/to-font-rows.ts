import type { Font, FontSource } from "@design-studio/actions/font/schema";

interface FontText {
  readonly file: string;
  readonly text: string;
}

interface FontToken {
  readonly name: string;
  readonly value: string;
}

interface NamedFamily {
  readonly family: string;
  readonly source: FontSource;
}

interface FontScan {
  readonly families: readonly NamedFamily[];
  readonly texts: readonly FontText[];
  readonly tokens: readonly FontToken[];
}

const MAX_ROWS = 200;

const TAILWIND_PATTERN = /@import\s+["']tailwindcss|@tailwind\s|@theme\b/u;

const FONT_FACE_PATTERN = /@font-face\s*\{(?<body>[^}]*)\}/gu;

const FACE_FAMILY_PATTERN = /font-family\s*:\s*(?<family>[^;]+)/u;

const GOOGLE_PATTERN = /https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s)<>]+/gu;

const TOKEN_PATTERN = /(?<name>--font-[a-z0-9-]+)\s*:\s*(?<value>[^;}]+)/gu;

const SKIPPED_TOKEN =
  /^--font-(?:weight|size|feature|variation|style|stretch)/u;

const MONO_PATTERN = /mono|code/iu;

const SERIF_PATTERN =
  /fraunces|playfair|lora|merriweather|georgia|garamond|crimson|baskerville|(?<!sans )serif/iu;

const PLAIN_FAMILY = /^[A-Za-z][A-Za-z0-9 _-]{0,60}$/u;

const SYSTEM_FONTS: readonly Font[] = [
  ["system-ui", "system-ui, sans-serif"],
  ["ui-serif", "ui-serif, Georgia, serif"],
  ["ui-monospace", "ui-monospace, monospace"],
  ["Georgia", "Georgia, serif"],
  ["Arial", "Arial, sans-serif"],
].map(([name = "", value = ""]) => ({
  className: null,
  family: name,
  preview: value,
  source: "system",
  stack: value,
  token: null,
}));

const toPlainName = (value: string): string =>
  value.replaceAll(/["']/gu, "").trim();

const toFirstFamily = (value: string): string =>
  toPlainName(value.split(",")[0] ?? "");

const toKey = (value: string): string =>
  value.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");

const isTailwind = (texts: readonly FontText[]): boolean =>
  texts.some((entry) => TAILWIND_PATTERN.test(entry.text));

const toFaceFamilies = (text: string): string[] =>
  [...text.matchAll(FONT_FACE_PATTERN)].flatMap((match) => {
    const family =
      FACE_FAMILY_PATTERN.exec(match.groups?.body ?? "")?.groups?.family ?? "";

    return [toFirstFamily(family)];
  });

const toLinkFamilies = (url: string): string[] => {
  const clean = url.replaceAll("&amp;", "&");

  if (!URL.canParse(clean)) {
    return [];
  }

  return new URL(clean).searchParams
    .getAll("family")
    .map((value) => (value.split(":")[0] ?? "").replaceAll("+", " ").trim());
};

const toGoogleFamilies = (text: string): string[] =>
  [...text.matchAll(GOOGLE_PATTERN)].flatMap((match) =>
    toLinkFamilies(match[0])
  );

const toTextFamilies = (texts: readonly FontText[]): NamedFamily[] =>
  texts.flatMap((entry) => [
    ...toFaceFamilies(entry.text).map((family): NamedFamily => ({
      family,
      source: "font-face",
    })),
    ...toGoogleFamilies(entry.text).map((family): NamedFamily => ({
      family,
      source: "google-link",
    })),
  ]);

const toTextTokens = (texts: readonly FontText[]): FontToken[] =>
  texts.flatMap((entry) =>
    [...entry.text.matchAll(TOKEN_PATTERN)].map((match) => ({
      name: match.groups?.name ?? "",
      value: (match.groups?.value ?? "").trim(),
    }))
  );

const toFontTokens = (scan: FontScan): FontToken[] => {
  const byName = new Map<string, FontToken>();

  for (const token of [...scan.tokens, ...toTextTokens(scan.texts)]) {
    if (!SKIPPED_TOKEN.test(token.name) && !byName.has(token.name)) {
      byName.set(token.name, token);
    }
  }

  return [...byName.values()];
};

const toFallback = (family: string): string => {
  if (MONO_PATTERN.test(family)) {
    return `'${family}', ui-monospace, monospace`;
  }

  if (SERIF_PATTERN.test(family)) {
    return `'${family}', ui-serif, Georgia, serif`;
  }

  return `'${family}', ui-sans-serif, system-ui, sans-serif`;
};

const toClassName = (token: string, hasTailwind: boolean): string | null => {
  if (!hasTailwind) {
    return null;
  }

  return token.replace(/^--/u, "");
};

const toTokenOf = (
  family: string,
  tokens: readonly FontToken[]
): FontToken | null => {
  const pattern = new RegExp(toKey(family), "u");

  return tokens.find((token) => pattern.test(toKey(token.value))) ?? null;
};

const toRow = (
  named: NamedFamily,
  token: FontToken | null,
  hasTailwind: boolean
): Font => {
  if (token === null) {
    return {
      className: null,
      family: named.family,
      preview: toFallback(named.family),
      source: named.source,
      stack: toFallback(named.family),
      token: null,
    };
  }

  return {
    className: toClassName(token.name, hasTailwind),
    family: named.family,
    preview: token.value,
    source: named.source,
    stack: `var(${token.name})`,
    token: token.name,
  };
};

const toTokenFamily = (token: FontToken): string => {
  const first = toFirstFamily(token.value);

  if (PLAIN_FAMILY.test(first)) {
    return first;
  }

  return token.name.replace(/^--font-/u, "");
};

const toProjectRows = (scan: FontScan): Font[] => {
  const hasTailwind = isTailwind(scan.texts);
  const tokens = toFontTokens(scan);
  const named = [...scan.families, ...toTextFamilies(scan.texts)];
  const rows: Font[] = [];
  const seen = new Set<string>();
  const usedTokens = new Set<string>();

  for (const entry of named) {
    const key = toKey(entry.family);

    if (key !== "" && !seen.has(key)) {
      seen.add(key);
      const token = toTokenOf(entry.family, tokens);

      usedTokens.add(token?.name ?? "");
      rows.push(toRow(entry, token, hasTailwind));
    }
  }

  for (const token of tokens) {
    if (!usedTokens.has(token.name)) {
      rows.push(
        toRow(
          { family: toTokenFamily(token), source: "token" },
          token,
          hasTailwind
        )
      );
    }
  }

  return rows;
};

const toFontRows = (scan: FontScan): readonly Font[] =>
  [...toProjectRows(scan), ...SYSTEM_FONTS].slice(0, MAX_ROWS);

export { toFontRows };

export type { FontScan, FontText, FontToken, NamedFamily };
