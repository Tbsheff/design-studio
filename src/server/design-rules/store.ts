import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project } from '../../shared/contracts.js';
import type { DesignRulesState } from '../../shared/design-rules.js';
import { writeFileAtomic } from '../design-system/packs.js';
import { deriveRules } from './derive.js';
import { extractRulesBlock, upsertRulesBlock } from './markdown.js';
import { parseRules } from './parse.js';

export const STUDIO_RULES_FILE = 'design-rules.txt';
const DOC_FILES = ['DESIGN.md', 'AGENTS.md', 'CLAUDE.md'];

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

interface Doc {
  file: string;
  text: string;
}

function docPaths(project: Project): string[] {
  const appDir = project.app?.appDir.replace(/^\.\/?/, '').replace(/\/+$/, '') ?? '';
  const dirs = appDir ? ['', appDir] : [''];
  return dirs.flatMap((dir) => DOC_FILES.map((file) => (dir ? `${dir}/${file}` : file)));
}

async function readDocs(project: Project, direction: Direction): Promise<Doc[]> {
  const docs = await Promise.all(docPaths(project).map(async (file) => ({ file, text: await readOptional(path.join(direction.workTree, file)) })));
  return docs.filter((doc): doc is Doc => doc.text !== null && doc.text.trim() !== '');
}

function explicitBlock(docs: Doc[]): { file: string; text: string } | null {
  for (const doc of docs) {
    const block = extractRulesBlock(doc.text);
    if (block !== null) return { file: doc.file, text: block };
  }
  return null;
}

export interface RulesPlace {
  project: Project;
  direction: Direction;
  studioDir: string;
}

function state(text: string, origin: DesignRulesState['origin'], file: string | null, docs: Doc[]): DesignRulesState {
  const derived = deriveRules(docs.filter((doc) => extractRulesBlock(doc.text) === null));
  return { text, rules: parseRules(text), origin, file, editable: true, imported: derived.trim() ? derived : null, importFrom: docs.map((doc) => doc.file) };
}

export async function loadDesignRules(place: RulesPlace): Promise<DesignRulesState> {
  const docs = await readDocs(place.project, place.direction);
  if (place.project.app) {
    const own = await readOptional(path.join(place.studioDir, STUDIO_RULES_FILE));
    if (own !== null) return state(own, 'studio', null, docs);
  }
  const block = explicitBlock(place.project.app ? docs : docs.filter((doc) => doc.file === 'DESIGN.md'));
  if (block) return state(block.text, place.project.app ? 'app-docs' : 'design-md', block.file, docs);
  return state('', 'none', null, docs);
}

export async function saveDesignRules(place: RulesPlace, text: string): Promise<{ file: string; inRepo: boolean }> {
  const clean = `${text.replace(/\r\n/g, '\n').trim()}\n`;
  if (place.project.app) {
    const file = path.join(place.studioDir, STUDIO_RULES_FILE);
    await writeFileAtomic(file, clean);
    return { file, inRepo: false };
  }
  const file = path.join(place.direction.workTree, 'DESIGN.md');
  const current = (await readOptional(file)) ?? '';
  await writeFileAtomic(file, upsertRulesBlock(current, clean));
  return { file: 'DESIGN.md', inRepo: true };
}
