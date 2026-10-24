import { matchColorName } from './names.js';
import type { Candidate, Harvest, SourceKind } from './types.js';
import { candidate } from './vars.js';
import { colorsInText, primaryFamily } from './values.js';

const FONT_ROLES: Array<[RegExp, string]> = [
  [/\b(mono|monospace|code)\b/i, 'font.mono'],
  [/\b(heading|headings|display|title|titles|headline|headlines)\b/i, 'font.display'],
  [/\b(body|text|paragraph|paragraphs|ui|base|copy|sans)\b/i, 'font.body'],
];

function plain(text: string): string {
  return text.replace(/[*_`~]/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

function nameBefore(line: string, at: number): { name: string; token: string; confidence: 'high' | 'medium' } | null {
  const before = plain(line.slice(0, at));
  const vars = [...before.matchAll(/--[\w-]+/g)].map((match) => match[0]);
  for (const name of vars.reverse()) {
    const match = matchColorName(name);
    if (match) return { name, ...match };
  }
  const words = before.split(/[^A-Za-z0-9-]+/).filter(Boolean).slice(-4);
  for (let end = words.length; end > 0; end -= 1) {
    for (const size of [2, 1]) {
      if (end - size < 0) continue;
      const name = words.slice(end - size, end).join('-');
      const match = matchColorName(name);
      if (match) return { name, ...match };
    }
  }
  return null;
}

function fontsIn(line: string, inTypography: boolean): Array<{ token: string; stack: string }> {
  const text = plain(line);
  if (colorsInText(text).length > 0) return [];
  if (!inTypography && !/\b(font|fonts|typeface|family|families)\b/i.test(text)) return [];
  const colon = text.indexOf(':');
  if (colon < 0) return [];
  const label = text.slice(0, colon);
  const value = text.slice(colon + 1).split(/[(;—–]| - /)[0]?.trim() ?? '';
  if (value === '' || value.length > 120) return [];
  const role = FONT_ROLES.find(([pattern]) => pattern.test(label));
  if (!role || !primaryFamily(value)) return [];
  return [{ token: role[1], stack: value }];
}

function colorCandidates(line: string, heading: string, source: SourceKind, label: string): Candidate[] {
  const out: Candidate[] = [];
  for (const color of colorsInText(line)) {
    const at = line.indexOf(color);
    const named = nameBefore(line, at);
    if (!named) continue;
    const dark = /\bdark\b/i.test(line.slice(at + color.length, at + color.length + 30)) || /\bdark\b/i.test(heading);
    const found = candidate({ token: named.token, confidence: 'medium' }, dark ? { dark: color } : { value: color }, source, `${label}: "${named.name}"`, 'medium');
    if (found) out.push(found);
  }
  return out;
}

function fontCandidates(line: string, heading: string, source: SourceKind, label: string): Candidate[] {
  return fontsIn(line, /typograph|font|type\b/i.test(heading)).flatMap((font) => {
    const found = candidate({ token: font.token, confidence: 'medium' }, { value: font.stack }, source, `${label}: ${font.token.replace('font.', '')} font`, 'medium');
    return found ? [found] : [];
  });
}

function proseLines(markdown: string): Array<{ line: string; heading: string }> {
  const out: Array<{ line: string; heading: string }> = [];
  let inFence = false;
  let heading = '';
  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n').slice(0, 4000)) {
    if (/^\s*(```|~~~)/.test(raw)) inFence = !inFence;
    else if (inFence) continue;
    else if (/^#{1,6}\s/.test(raw)) heading = raw;
    else out.push({ line: raw.slice(0, 400), heading });
  }
  return out;
}

export function harvestDesignText(markdown: string, source: SourceKind, label: string): Harvest {
  const candidates = proseLines(markdown).flatMap(({ line, heading }) => [...colorCandidates(line, heading, source, label), ...fontCandidates(line, heading, source, label)]);
  return { source, label, candidates };
}

export function firstHeading(markdown: string): string | null {
  const match = /^#\s+(.+)$/m.exec(markdown);
  const title = match?.[1]?.replace(/[*_`#]/g, '').trim() ?? '';
  return title === '' ? null : title.slice(0, 80);
}
