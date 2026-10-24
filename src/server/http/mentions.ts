import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RunMention } from '../../shared/contracts.js';
import { checkPathInside } from '../agent/permissions.js';
import { BadRequestError } from '../store/errors.js';
import type { MentionFile } from '../types.js';

const SKIP = new Set(['node_modules', '.git', 'dist', '.vite', 'vite-cache', '.DS_Store', '.studio']);
const TREE_MAX = 3000;
const MENTION_MAX = 10;
const FILE_MAX_BYTES = 20_000;

export async function listWorkTree(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    if (out.length >= TREE_MAX) return;
    const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      if (out.length >= TREE_MAX || SKIP.has(item.name) || item.name.startsWith('.')) continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) await walk(full);
      else if (item.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  await walk(root);
  return out;
}

export function parseMentions(raw: unknown): RunMention[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > MENTION_MAX) throw new BadRequestError(`mentions must be an array of up to ${MENTION_MAX}`);
  return raw.map((item: unknown): RunMention => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    if (record['kind'] === 'file' && typeof record['path'] === 'string' && record['path'].length <= 500) return { kind: 'file', path: record['path'] };
    if (record['kind'] === 'token' && typeof record['name'] === 'string' && typeof record['value'] === 'string' && record['name'].length <= 200 && record['value'].length <= 500) {
      return { kind: 'token', name: record['name'], value: record['value'] };
    }
    throw new BadRequestError('each mention must be a file path or a token');
  });
}

export async function readMentionFiles(workTree: string, mentions: readonly RunMention[] | undefined): Promise<MentionFile[]> {
  const files: MentionFile[] = [];
  for (const mention of mentions ?? []) {
    if (mention.kind !== 'file' || checkPathInside(workTree, mention.path) !== null) continue;
    const absolute = path.resolve(workTree, mention.path);
    const info = await stat(absolute).catch(() => null);
    if (!info?.isFile()) continue;
    const text = (await readFile(absolute, 'utf8').catch(() => '')).slice(0, FILE_MAX_BYTES);
    if (text.includes('\u0000')) continue;
    files.push({ path: mention.path, text, truncated: info.size > FILE_MAX_BYTES });
  }
  return files;
}
