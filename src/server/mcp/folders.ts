import { realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const MAX_PATH = 4096;
const SYSTEM_TREES = ['/System', '/Library', '/usr', '/bin', '/sbin', '/etc', '/var', '/dev', '/cores', '/opt', '/Applications', '/private/etc', '/private/var', '/Network'];
const SYSTEM_ROOTS = ['/', '/private', '/Users', '/Volumes'];

export class FolderError extends Error {}

export function isInside(target: string, folder: string): boolean {
  return target === folder || target.startsWith(folder.endsWith(path.sep) ? folder : folder + path.sep);
}

async function real(target: string): Promise<string> {
  return realpath(target).catch(() => path.resolve(target));
}

export async function safeFolder(raw: unknown, dataDir: string): Promise<string> {
  if (typeof raw !== 'string' || raw.trim() === '') throw new FolderError('folder is required');
  if (raw.includes('\0') || raw.length > MAX_PATH) throw new FolderError('folder is not a valid path');
  const expanded = raw.startsWith('~/') ? path.join(homedir(), raw.slice(2)) : raw;
  if (!path.isAbsolute(expanded)) throw new FolderError('folder must be an absolute path');
  let folder: string;
  try {
    folder = await realpath(path.resolve(expanded));
  } catch {
    throw new FolderError(`folder not found: ${raw}`);
  }
  if (!(await stat(folder)).isDirectory()) throw new FolderError(`not a folder: ${folder}`);
  if (isInside(folder, await real(dataDir))) throw new FolderError('cannot use a folder inside the studio data dir');
  const home = await real(homedir());
  if (folder === home || SYSTEM_ROOTS.includes(folder)) throw new FolderError(`pick a folder inside ${folder}, not the folder itself`);
  const blocked = [...SYSTEM_TREES, path.join(home, 'Library')];
  if (blocked.some((tree) => isInside(folder, tree))) throw new FolderError('cannot use a system folder');
  return folder;
}

export async function downloadsFolder(): Promise<string> {
  return real(path.join(homedir(), 'Downloads'));
}
