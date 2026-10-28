import type { VersionChanges, VersionFileDiff } from '../../shared/contracts.js';

type Git = (args: string[]) => Promise<string>;

const MAX_FILES = 100;
const FILE_MAX = 64 * 1024;
const TOTAL_MAX = 512 * 1024;
const PARALLEL = 8;

interface Entry {
  status: VersionFileDiff['status'];
  path: string;
  oldPath?: string;
}

const STATUS: Record<string, VersionFileDiff['status']> = { A: 'added', D: 'removed', M: 'modified', T: 'modified', R: 'renamed', C: 'added' };

export function parseNameStatus(text: string): Entry[] {
  const parts = text.split('\0').filter((part) => part !== '');
  const entries: Entry[] = [];
  for (let i = 0; i < parts.length; ) {
    const code = (parts[i] ?? '').charAt(0);
    const status = STATUS[code] ?? 'modified';
    if (code === 'R' || code === 'C') {
      const oldPath = parts[i + 1] ?? '';
      entries.push({ status, path: parts[i + 2] ?? oldPath, ...(code === 'R' ? { oldPath } : {}) });
      i += 3;
    } else {
      entries.push({ status, path: parts[i + 1] ?? '' });
      i += 2;
    }
  }
  return entries;
}

function countLines(patch: string): { additions: number; deletions: number; binary: boolean } {
  let additions = 0;
  let deletions = 0;
  let inHunk = false;
  let binary = false;
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) inHunk = true;
    else if (!inHunk && line.startsWith('Binary files ')) binary = true;
    else if (inHunk && line.startsWith('+')) additions += 1;
    else if (inHunk && line.startsWith('-')) deletions += 1;
  }
  return { additions, deletions, binary };
}

async function fileDiff(git: Git, from: string, to: string, entry: Entry, room: number): Promise<VersionFileDiff> {
  const paths = entry.oldPath ? [entry.oldPath, entry.path] : [entry.path];
  const full = await git(['diff', '--no-color', '--no-ext-diff', '-M', '-U3', from, to, '--', ...paths]);
  const counts = countLines(full);
  const limit = Math.min(FILE_MAX, Math.max(0, room));
  const cut = full.length > limit;
  return { ...entry, ...counts, patch: cut ? full.slice(0, limit) : full, truncated: cut };
}

export async function diffVersionFiles(git: Git, from: string, to: string): Promise<VersionChanges> {
  const entries = parseNameStatus(await git(['diff', '--name-status', '-z', '-M', from, to]));
  const shown = entries.slice(0, MAX_FILES);
  const files: VersionFileDiff[] = [];
  let used = 0;
  for (let start = 0; start < shown.length; start += PARALLEL) {
    const batch = await Promise.all(shown.slice(start, start + PARALLEL).map((entry) => fileDiff(git, from, to, entry, TOTAL_MAX - used)));
    for (const file of batch) {
      used += file.patch.length;
      files.push(file);
    }
  }
  return { from, to, files, totalFiles: entries.length, truncated: entries.length > shown.length || files.some((file) => file.truncated) };
}
