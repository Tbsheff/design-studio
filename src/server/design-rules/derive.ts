import { targetSelector } from './parse.js';

const DESIGN_WORDS = /\b(colou?rs?|fonts?|typography|shadows?|borders?|backgrounds?|radius|rounded|spacing|padding|dark mode|tokens?|icons?|motion|animations?|tailwind|surfaces?|contrast|hex|layout|whitespace)\b/i;
const NATIVE_TAGS: Record<string, string> = { Button: 'button', Input: 'input', Select: 'select', Textarea: 'textarea', Table: 'table' };
const INVARIANT = /^(rounded(?:-[a-z0-9]+)?|h-\d+(?:\.\d+)?)$/;

interface Doc {
  file: string;
  text: string;
}

interface Section {
  heading: string;
  lines: string[];
}

function sections(text: string): Section[] {
  const out: Section[] = [{ heading: '', lines: [] }];
  let fence = false;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && /^#{1,4}\s/.test(line)) out.push({ heading: line.replace(/^#+\s*/, '').trim(), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
}

function bullets(lines: string[]): string[] {
  return lines.filter((line) => /^\s*[-*]\s+/.test(line)).map((line) => line.replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim());
}

function fontLines(text: string): string[] {
  const table = /\|\s*\**Sans[^|]*\|\s*([A-Z][\w ]{1,30}?)\s*\|/.exec(text)?.[1];
  const css = /--font-sans:\s*["']?([A-Z][\w ]{1,30}?)["',;]/.exec(text)?.[1];
  const family = (table ?? css)?.trim();
  return family ? [`font: ${family}`] : [];
}

function rawHexLines(text: string): string[] {
  return /never raw hex|no raw hex|not raw hex|raw hex values/i.test(text) ? ['no raw hex'] : [];
}

function addClass(map: Map<string, Set<string>>, target: string, cls: string): void {
  if (!targetSelector(target)) return;
  const key = target.toLowerCase();
  const set = map.get(key) ?? new Set<string>();
  set.add(cls);
  map.set(key, set);
}

function forTargets(text: string, map: Map<string, Set<string>>): void {
  for (const match of text.matchAll(/`([a-z][\w:-]*)`\s+for\s+([a-z ,]+?)(?=,\s*`|\s*$|\s*[—.;(])/gim)) {
    const cls = match[1] ?? '';
    if (!INVARIANT.test(cls)) continue;
    for (const word of (match[2] ?? '').split(/,|\band\b/)) addClass(map, word.trim().split(' ')[0] ?? '', cls);
  }
}

function referenceTarget(name: string): string | null {
  if (/\bbutton\b/.test(name)) return 'buttons';
  if (name === 'input') return 'inputs';
  return name === 'card' ? 'cards' : null;
}

function keepsClass(target: string, cls: string): boolean {
  return INVARIANT.test(cls) && (target === 'inputs' || cls.startsWith('rounded'));
}

function quickReference(text: string, map: Map<string, Set<string>>): void {
  for (const match of text.matchAll(/^([A-Za-z][A-Za-z ()-]{1,40}?):\s{2,}(.+)$/gm)) {
    const target = referenceTarget((match[1] ?? '').toLowerCase());
    if (!target) continue;
    for (const cls of (match[2] ?? '').split(/\s+/).filter((item) => keepsClass(target, item))) addClass(map, target, cls);
  }
}

function classLines(text: string): string[] {
  const map = new Map<string, Set<string>>();
  forTargets(text, map);
  quickReference(text, map);
  return [...map.entries()].map(([target, classes]) => `${target}: ${[...classes].sort().join(' ')}`);
}

function componentLines(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/`(@?[\w./-]+\/(?:components\/)?([a-z-]+))`\s*[—–-]+\s*([A-Z]\w*)/g)) {
    const name = match[3] ?? '';
    const tag = NATIVE_TAGS[name];
    if (tag) out.push(`use ${name} from ${match[1]}, not <${tag}>`);
  }
  return out;
}

function proseLines(doc: Doc): string[] {
  const out: string[] = [];
  for (const section of sections(doc.text)) {
    const designSection = /design|\bui\b|styl|do'?s|don'?t|frontend/i.test(section.heading);
    for (const line of bullets(section.lines)) {
      if (line.startsWith('[') || line.length > 220 || !DESIGN_WORDS.test(line)) continue;
      if (designSection || /tailwind|class/i.test(line)) out.push(/^don'?t$/i.test(section.heading.trim()) && !/^don'?t/i.test(line) ? `Don't ${line}` : line);
    }
  }
  return out;
}

export function deriveRules(docs: Doc[]): string {
  const blocks: string[] = [];
  const seen = new Set<string>();
  const fresh = (line: string) => !seen.has(line) && Boolean(seen.add(line));
  for (const doc of docs) {
    const lines = [...rawHexLines(doc.text), ...fontLines(doc.text), ...classLines(doc.text), ...componentLines(doc.text), ...proseLines(doc).slice(0, 14)].filter(fresh);
    if (lines.length > 0) blocks.push([`# From ${doc.file}`, ...lines].join('\n'));
  }
  return blocks.join('\n\n');
}
