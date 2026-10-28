import { DESIGN_MD_RULES_END, DESIGN_MD_RULES_START } from '../../shared/design-rules.js';

const FENCE = /^(\s*)(```|~~~)\s*rules\s*$/i;

function fencedRules(lines: string[]): string | null {
  for (let at = 0; at < lines.length; at += 1) {
    const open = FENCE.exec(lines[at] ?? '');
    if (!open?.[2]) continue;
    const close = lines.findIndex((line, index) => index > at && line.trim() === open[2]);
    return lines.slice(at + 1, close < 0 ? lines.length : close).join('\n');
  }
  return null;
}

export function extractRulesBlock(markdown: string): string | null {
  const text = markdown.replace(/\r\n/g, '\n');
  const start = text.indexOf(DESIGN_MD_RULES_START);
  const end = start < 0 ? -1 : text.indexOf(DESIGN_MD_RULES_END, start);
  if (start >= 0 && end >= 0) {
    const inner = text.slice(start + DESIGN_MD_RULES_START.length, end);
    return (fencedRules(inner.split('\n')) ?? inner).trim();
  }
  const fenced = fencedRules(text.split('\n'));
  return fenced === null ? null : fenced.trim();
}

function rulesSection(text: string): string {
  return [DESIGN_MD_RULES_START, '```rules', text.trim(), '```', DESIGN_MD_RULES_END].join('\n');
}

function replaceFence(lines: string[], text: string): string | null {
  for (let at = 0; at < lines.length; at += 1) {
    const open = FENCE.exec(lines[at] ?? '');
    if (!open?.[2]) continue;
    const close = lines.findIndex((line, index) => index > at && line.trim() === open[2]);
    if (close < 0) return null;
    return [...lines.slice(0, at + 1), text.trim(), ...lines.slice(close)].join('\n');
  }
  return null;
}

export function upsertRulesBlock(markdown: string, text: string): string {
  const source = markdown.replace(/\r\n/g, '\n');
  const start = source.indexOf(DESIGN_MD_RULES_START);
  const end = start < 0 ? -1 : source.indexOf(DESIGN_MD_RULES_END, start);
  if (start >= 0 && end >= 0) return source.slice(0, start) + rulesSection(text) + source.slice(end + DESIGN_MD_RULES_END.length);
  const fenced = replaceFence(source.split('\n'), text);
  if (fenced !== null) return fenced;
  const body = source.trimEnd();
  return `${body}${body ? '\n\n' : ''}## Design rules\n\nThe studio agent follows these rules, and Review checks the ones it can test. One rule per line.\n\n${rulesSection(text)}\n`;
}
