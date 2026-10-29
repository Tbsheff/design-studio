import { readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { MAX_TOKENS_FILE_BYTES } from '../design-system/extract/draft.js';
import { approve, EditError, oneLine, type EditDeps } from './edit-deps.js';
import { isInside, safeFolder } from './folders.js';

const TOKEN_FILE = /\.(json|css)$/i;

async function resolveFile(raw: string, dataDir: string): Promise<string> {
  if (raw.includes('\0')) throw new EditError('tokensFile is not a valid path');
  const expanded = raw.startsWith('~/') ? path.join(homedir(), raw.slice(2)) : raw;
  if (!path.isAbsolute(expanded)) throw new EditError('tokensFile must be an absolute path');
  const file = await realpath(expanded).catch(() => null);
  if (!file) throw new EditError(`tokensFile not found: ${raw}`);
  const info = await stat(file);
  if (!info.isFile()) throw new EditError(`tokensFile is not a file: ${file}`);
  if (!TOKEN_FILE.test(file)) throw new EditError('tokensFile must be a .json or .css file (Figma variables, DTCG, Tokens Studio or CSS custom properties)');
  if (info.size > MAX_TOKENS_FILE_BYTES) throw new EditError(`${path.basename(file)} is larger than 2 MB`);
  await safeFolder(path.dirname(file), dataDir);
  return file;
}

export async function readTokensFileInput(deps: EditDeps, raw: string, client: string): Promise<{ name: string; text: string }> {
  const file = await resolveFile(raw, deps.dataDir);
  const projects = await safeFolder(await deps.projectsFolder(), deps.dataDir).catch(() => null);
  if (projects === null || !isInside(file, projects)) {
    await approve(deps, { tool: 'create_design_system', action: 'Read a tokens file for a design system', projectId: null, client, title: `${client} wants to read ${oneLine(file, 160)} for a design system`, detail: 'The studio copies this tokens file into the draft project, where outside agents can read it. It does not connect to Figma.' });
  }
  return { name: path.basename(file), text: await readFile(file, 'utf8') };
}
