import { execFile } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

export const OSASCRIPT = '/usr/bin/osascript';
const PICK_FOLDER_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_TITLE_LENGTH = 200;
const MAX_PATH_LENGTH = 4096;
const USER_CANCELED = /-128\b/;

const CHOOSE_FOLDER_SCRIPT = [
  'on run argv',
  'set promptText to item 1 of argv',
  'activate',
  'if (count of argv) > 1 then',
  'set chosen to choose folder with prompt promptText default location (POSIX file (item 2 of argv))',
  'else',
  'set chosen to choose folder with prompt promptText',
  'end if',
  'return POSIX path of chosen',
  'end run',
];

export type ExecFileFn = (
  file: string,
  args: string[],
  options: { timeout: number; maxBuffer: number },
  callback: (error: (Error & { code?: unknown; killed?: boolean; signal?: unknown }) | null, stdout: string, stderr: string) => void,
) => void;

export type PickFolderResult = { status: 'picked'; path: string } | { status: 'canceled' } | { status: 'unsupported' } | { status: 'busy' } | { status: 'timeout' } | { status: 'failed'; error: string };

export interface FolderPicker {
  pick(input: { title?: string; defaultPath?: string }): Promise<PickFolderResult>;
}

interface FolderPickerOptions {
  platform?: NodeJS.Platform;
  execFile?: ExecFileFn;
  timeoutMs?: number;
}

async function existingFolder(target: string | undefined): Promise<string | null> {
  if (!target || target.includes('\0') || target.length > MAX_PATH_LENGTH || !path.isAbsolute(target)) return null;
  try {
    const real = await realpath(target);
    return (await stat(real)).isDirectory() ? real : null;
  } catch {
    return null;
  }
}

function cleanTitle(title: string | undefined): string {
  const text = (title ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
  return text || 'Choose a folder';
}

const defaultExecFile: ExecFileFn = (file, args, options, callback) => {
  execFile(file, args, { ...options, encoding: 'utf8' }, (error, stdout, stderr) => callback(error, String(stdout), String(stderr)));
};

export function createFolderPicker(options: FolderPickerOptions = {}): FolderPicker {
  const platform = options.platform ?? process.platform;
  const run = options.execFile ?? defaultExecFile;
  const timeoutMs = options.timeoutMs ?? PICK_FOLDER_TIMEOUT_MS;
  let open = false;

  const runScript = (args: string[]): Promise<PickFolderResult> =>
    new Promise((resolve) => {
      const scriptArgs = CHOOSE_FOLDER_SCRIPT.flatMap((line) => ['-e', line]);
      run(OSASCRIPT, [...scriptArgs, ...args], { timeout: timeoutMs, maxBuffer: 64 * 1024 }, (error, stdout, stderr) => {
        if (!error) {
          resolve({ status: 'picked', path: stdout.trim() });
          return;
        }
        if (error.killed || error.signal === 'SIGTERM') resolve({ status: 'timeout' });
        else if (USER_CANCELED.test(stderr) || USER_CANCELED.test(error.message)) resolve({ status: 'canceled' });
        else resolve({ status: 'failed', error: stderr.trim() || error.message });
      });
    });

  return {
    async pick(input) {
      if (platform !== 'darwin') return { status: 'unsupported' };
      if (open) return { status: 'busy' };
      open = true;
      try {
        const start = await existingFolder(input.defaultPath);
        const result = await runScript(start ? [cleanTitle(input.title), start] : [cleanTitle(input.title)]);
        if (result.status !== 'picked') return result;
        const chosen = result.path.length > 1 ? result.path.replace(/\/+$/, '') : result.path;
        const real = await existingFolder(chosen);
        return real ? { status: 'picked', path: real } : { status: 'failed', error: `picked folder not found: ${chosen}` };
      } finally {
        open = false;
      }
    },
  };
}
