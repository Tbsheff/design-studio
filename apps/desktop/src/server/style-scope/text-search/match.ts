import type { TextSearchQuery } from "./deps.js";
import { TextSearchError } from "./errors.js";

interface Found {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly groups: readonly (string | null)[];
  readonly named: Readonly<Record<string, string>>;
}

const toEscapeRegex = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const toSourceOf = (query: TextSearchQuery): string => {
  let body = toEscapeRegex(query.query);

  if (query.regex) {
    body = query.query;
  }

  if (query.wholeWord) {
    return String.raw`\b(?:${body})\b`;
  }

  return body;
};

const toFlagsOf = (query: TextSearchQuery): string => {
  if (query.caseSensitive) {
    return "gu";
  }

  return "giu";
};

const toBuildRegExp = (body: string, flags: string): RegExp =>
  new RegExp(body, flags);

const toMatcher = (query: TextSearchQuery): RegExp => {
  try {
    return toBuildRegExp(toSourceOf(query), toFlagsOf(query));
  } catch (error) {
    throw new TextSearchError(`The regex is not valid: ${String(error)}`);
  }
};

const toFindAll = (text: string, matcher: RegExp): Found[] => {
  const found: Found[] = [];

  for (const match of text.matchAll(matcher)) {
    if (match[0].length > 0) {
      found.push({
        end: match.index + match[0].length,
        groups: match.slice(1).map((group) => group ?? null),
        named: { ...match.groups },
        start: match.index,
        text: match[0],
      });
    }
  }

  return found;
};

const toTokenValue = (found: Found, token: string): string => {
  if (token === "$") {
    return "$";
  }

  if (token === "&") {
    return found.text;
  }

  if (token.startsWith("<")) {
    return found.named[token.slice(1, -1)] ?? "";
  }

  return found.groups[Number(token) - 1] ?? "";
};

const toReplacementOf = (
  found: Found,
  replace: string,
  isRegex: boolean
): string => {
  if (!isRegex) {
    return replace;
  }

  return replace.replaceAll(
    /\$(?<token>\$|&|\d{1,2}|<[^>]+>)/gu,
    (_all, token: string) => toTokenValue(found, token)
  );
};

export { toFindAll as findAll, toReplacementOf as replacementOf, toMatcher };

export type { Found };
