import type { CustomProperties } from './css.js';
import { resolveVars } from './css.js';
import { matchColorName, matchFontName, matchRadiusName, matchScaleName, matchShadowName } from './names.js';
import type { NameMatch } from './names.js';
import type { Candidate, CandidateConfidence, ExtraToken, SourceKind } from './types.js';
import { fontStack, genericFor, lengthPx, normalizeColor, normalizeLength, normalizeShadow } from './values.js';

function radiusValue(token: string, text: string): string | null {
  const length = normalizeLength(text);
  if (token === 'radius.pill') return (length && lengthPx(length) >= 100) || /^(50%|100%)$/.test(text) ? '9999px' : null;
  return length && lengthPx(length) <= 64 ? length : null;
}

function scaleValue(text: string): string | null {
  const length = normalizeLength(text);
  return length && lengthPx(length) > 0 && lengthPx(length) <= 400 ? length : null;
}

const VALIDATORS: Record<string, (token: string, text: string) => string | null> = {
  color: (_token, text) => normalizeColor(text),
  font: (token, text) => fontStack(text, token === 'font.mono' ? 'monospace' : genericFor(text)),
  shadow: (_token, text) => normalizeShadow(text),
  radius: radiusValue,
  text: (_token, text) => scaleValue(text),
  space: (_token, text) => scaleValue(text),
};

export function validValue(token: string, raw: string): string | null {
  const validate = VALIDATORS[token.split('.')[0] ?? ''];
  return validate ? validate(token, raw.trim()) : null;
}

export function matchVarName(name: string, value: string): NameMatch | null {
  if (normalizeColor(value)) return matchColorName(name);
  return matchFontName(name) ?? matchShadowName(name) ?? matchRadiusName(name) ?? matchScaleName(name, 'text') ?? matchScaleName(name, 'space');
}

export function candidate(match: NameMatch, values: { value?: string; dark?: string }, source: SourceKind, evidence: string, cap?: CandidateConfidence): Candidate | null {
  const value = values.value === undefined ? undefined : (validValue(match.token, values.value) ?? undefined);
  const dark = values.dark === undefined || !match.token.startsWith('color.') ? undefined : (validValue(match.token, values.dark) ?? undefined);
  if (value === undefined && dark === undefined) return null;
  const confidence = cap === 'medium' ? 'medium' : match.confidence;
  return { token: match.token, ...(value !== undefined ? { value } : {}), ...(dark !== undefined ? { dark } : {}), source, confidence, evidence };
}

export function candidatesFromVars(props: CustomProperties, source: SourceKind, label: string): Candidate[] {
  const out: Candidate[] = [];
  const names = new Set([...props.root.keys(), ...props.dark.keys()]);
  for (const name of names) {
    const rootRaw = props.root.get(name);
    const darkRaw = props.dark.get(name);
    const value = rootRaw === undefined ? undefined : resolveVars(rootRaw, [props.root]);
    const dark = darkRaw === undefined ? undefined : resolveVars(darkRaw, [props.dark, props.root]);
    const match = matchVarName(name, value ?? dark ?? '');
    if (!match) continue;
    const found = candidate(match, { value, dark }, source, `${label}: ${name}`);
    if (found) out.push(found);
  }
  return out;
}

const EXTRA_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LENGTH_GROUPS: Array<[RegExp, string, RegExp]> = [
  [/breakpoint|screen|^bp-/, 'breakpoint', /^(breakpoint|screen|bp)-?/],
  [/radius|rounded/, 'radius', /^(radius|rounded)-?/],
  [/^(text|font-size)/, 'text', /^(text|font-size)-?/],
  [/space|spacing|gap|gutter|pad|margin/, 'space', /^(space|spacing)-?/],
];

function extraName(raw: string, prefix: RegExp): string | null {
  const name = raw.replace(/^--/, '').toLowerCase().replace(prefix, '') || raw.replace(/^--/, '').toLowerCase();
  return EXTRA_NAME.test(name) && name.length <= 48 ? name : null;
}

export function extraToken(varName: string, value: string, dark: string | undefined, evidence: string): ExtraToken | null {
  const bare = varName.replace(/^--/, '').toLowerCase();
  const color = normalizeColor(value);
  if (color) {
    const name = extraName(varName, /^colou?r-/);
    const darkColor = dark === undefined ? null : normalizeColor(dark);
    return name ? { group: 'color', name, type: 'color', value: color, ...(darkColor ? { dark: darkColor } : {}), evidence } : null;
  }
  const shadow = /shadow|elevation/.test(bare) ? normalizeShadow(value) : null;
  if (shadow) {
    const name = extraName(varName, /^(shadow|elevation)-?/);
    return name ? { group: 'shadow', name, type: 'shadow', value: shadow, evidence } : null;
  }
  const length = normalizeLength(value);
  if (length) {
    const [, group, prefix] = LENGTH_GROUPS.find(([test]) => test.test(bare)) ?? [null, 'size', /^size-?/];
    const name = extraName(varName, prefix);
    return name ? { group, name, type: 'dimension', value: length, evidence } : null;
  }
  const font = /font|family|typeface/.test(bare) ? fontStack(value, genericFor(value)) : null;
  if (font) {
    const name = extraName(varName, /^font-(family-)?/);
    return name ? { group: 'font', name, type: 'fontFamily', value: font, evidence } : null;
  }
  return null;
}

export function harvestCssVars(props: CustomProperties, source: SourceKind, label: string): { candidates: Candidate[]; extras: ExtraToken[] } {
  const candidates: Candidate[] = [];
  const extras: ExtraToken[] = [];
  for (const name of new Set([...props.root.keys(), ...props.dark.keys()])) {
    const rootRaw = props.root.get(name);
    const darkRaw = props.dark.get(name);
    const value = rootRaw === undefined ? undefined : resolveVars(rootRaw, [props.root]);
    const dark = darkRaw === undefined ? undefined : resolveVars(darkRaw, [props.dark, props.root]);
    const evidence = `${label}: ${name}`;
    const match = matchVarName(name, value ?? dark ?? '');
    const found = match ? candidate(match, { value, dark }, source, evidence) : null;
    if (found) {
      candidates.push(found);
      continue;
    }
    const extra = value === undefined ? null : extraToken(name, value, dark, evidence);
    if (extra) extras.push(extra);
  }
  return { candidates, extras };
}
