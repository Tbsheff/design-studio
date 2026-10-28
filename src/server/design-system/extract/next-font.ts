import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { safeFileInside } from '../app-tokens/detect.js';
import type { Candidate } from './types.js';
import { fontStack, googleFontsUrlFor } from './values.js';

const LAYOUTS = ['app/layout', 'src/app/layout', 'pages/_app', 'src/pages/_app'];
const EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
const IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g;
const MONO = /mono|code/i;

export interface NextFonts {
  candidates: Candidate[];
  googleFontsUrl?: string;
  files: string[];
}

async function appDirs(root: string): Promise<string[]> {
  const dirs = [''];
  for (const group of ['apps', 'packages']) {
    const entries = await readdir(path.join(root, group), { withFileTypes: true }).catch(() => []);
    dirs.push(...entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => `${group}/${entry.name}`));
  }
  return dirs;
}

async function layoutFiles(root: string): Promise<string[]> {
  const options = (await appDirs(root)).flatMap((dir) => LAYOUTS.flatMap((layout) => EXTENSIONS.map((ext) => (dir ? `${dir}/${layout}${ext}` : `${layout}${ext}`))));
  const found = await Promise.all(options.map(async (relative) => ((await safeFileInside(root, relative)) ? relative : null)));
  return found.filter((item): item is string => item !== null);
}

function familiesIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(IMPORT_RE)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim() ?? '';
      if (/^[A-Z][A-Za-z0-9_]{1,40}$/.test(name)) out.push(name.replace(/_/g, ' '));
    }
  }
  return out;
}

function stack(family: string, mono: boolean): string | null {
  return mono ? fontStack(`'${family}', ui-monospace, monospace`, 'monospace') : fontStack(`'${family}', ui-sans-serif, system-ui, sans-serif`, 'sans-serif');
}

function fontCandidate(token: string, family: string, file: string, confidence: Candidate['confidence']): Candidate | null {
  const value = stack(family, token === 'font.mono');
  return value ? { token, value, source: 'folder', confidence, evidence: `${file}: next/font ${family}`, verified: true } : null;
}

export async function harvestNextFonts(root: string): Promise<NextFonts> {
  const counts = new Map<string, { count: number; file: string }>();
  const files = await layoutFiles(root);
  for (const file of files) {
    const absolute = await safeFileInside(root, file);
    const text = absolute ? await readFile(absolute, 'utf8').catch(() => '') : '';
    for (const family of familiesIn(text)) counts.set(family, { count: (counts.get(family)?.count ?? 0) + 1, file: counts.get(family)?.file ?? file });
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
  const sans = ranked.find(([family]) => !MONO.test(family));
  const mono = ranked.find(([family]) => MONO.test(family));
  const candidates = [
    sans ? fontCandidate('font.body', sans[0], sans[1].file, 'high') : null,
    sans ? fontCandidate('font.display', sans[0], sans[1].file, 'medium') : null,
    mono ? fontCandidate('font.mono', mono[0], mono[1].file, 'high') : null,
  ].filter((item): item is Candidate => item !== null);
  const families = [sans?.[0], mono?.[0]].filter((item): item is string => item !== undefined);
  const googleFontsUrl = googleFontsUrlFor(families) ?? undefined;
  return { candidates, ...(googleFontsUrl ? { googleFontsUrl } : {}), files: files.filter((file) => candidates.some((item) => item.evidence.startsWith(`${file}:`))) };
}
