import type { TextSearchQuery } from "./deps.js";
import { TextSearchError } from "./errors.js";

interface Found {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly groups: readonly (string | null)[];
  readonly named: Readonly<Record<string, string>>;
}

const escapeRegex = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const sourceOf = (query: TextSearchQuery): string => {
  let body = escapeRegex(query.query);

  if (query.regex) {
    body = query.query;
  }

  if (query.wholeWord) {
    return String.raw`\b(?:${body})\b`;
  }

  return body;
};

const flagsOf = (query: TextSearchQuery): string => {
  if (query.caseSensitive) {
    return "gu";
  }

  return "giu";
};

const buildRegExp = (body: string, flags: string): RegExp =>
  new RegExp(body, flags);

const toMatcher = (query: TextSearchQuery): RegExp => {
  try {
    return buildRegExp(sourceOf(query), flagsOf(query));
  } catch (error) {
    throw new TextSearchError(`The regex is not valid: ${String(error)}`);
  }
};

const findAll = (text: string, matcher: RegExp): Found[] => {
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

const tokenValue = (found: Found, token: string): string => {
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

const replacementOf = (
  found: Found,
  replace: string,
  isRegex: boolean
): string => {
  if (!isRegex) {
    return replace;
  }

  return replace.replaceAll(
    /\$(?<token>\$|&|\d{1,2}|<[^>]+>)/gu,
    (_all, token: string) => tokenValue(found, token)
  );
};

export { findAll, replacementOf, toMatcher };

export type { Found };
