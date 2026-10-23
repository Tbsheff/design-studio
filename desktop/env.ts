import { execFile } from 'node:child_process';
import path from 'node:path';

export type Env = Record<string, string>;
type SourceEnv = NodeJS.ProcessEnv;

const BASE_KEYS = ['HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'LANG'];
const EXTRA_KEYS = ['DESIGN_MEMORY_HOME', 'ANTHROPIC_API_KEY'];
const STUDIO_PREFIX = 'STUDIO_';
const PATH_MARK = '__STUDIO_PATH__';
const LOGIN_SHELL_TIMEOUT_MS = 3000;

function pick(source: SourceEnv, keys: string[]): Env {
  const out: Env = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
}

function studioVars(source: SourceEnv): Env {
  const keys = Object.keys(source).filter((key) => key.startsWith(STUDIO_PREFIX));
  return pick(source, keys);
}

export function nodeDirs(source: SourceEnv, execPath: string): string[] {
  const dirs: string[] = [];
  if (path.basename(execPath) === 'node') dirs.push(path.dirname(execPath));
  const npmNode = source.npm_node_execpath;
  if (npmNode) dirs.push(path.dirname(npmNode));
  return dirs;
}

export function knownPathDirs(home: string, extra: string[]): string[] {
  return [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    path.join(home, '.local', 'bin'),
    ...extra,
  ];
}

export function parseShellPath(output: string): string[] {
  const start = output.indexOf(PATH_MARK);
  const end = output.indexOf(PATH_MARK, start + PATH_MARK.length);
  if (start < 0 || end < 0) return [];
  return output.slice(start + PATH_MARK.length, end).split(':');
}

export function loginShellPath(source: SourceEnv): Promise<string[]> {
  const shell = source.SHELL || '/bin/zsh';
  const script = `printf '${PATH_MARK}%s${PATH_MARK}' "$PATH"`;
  return new Promise((resolve) => {
    execFile(shell, ['-ilc', script], { env: pick(source, BASE_KEYS), timeout: LOGIN_SHELL_TIMEOUT_MS }, (_error, stdout) => {
      resolve(parseShellPath(String(stdout ?? '')));
    });
  });
}

export function mergePath(...lists: string[][]): string {
  const seen = new Set<string>();
  for (const dir of lists.flat()) {
    if (dir && path.isAbsolute(dir)) seen.add(dir);
  }
  return [...seen].join(':');
}

export function baseEnv(source: SourceEnv, searchPath: string): Env {
  return { ...pick(source, BASE_KEYS), PATH: searchPath };
}

export function buildServerEnv(source: SourceEnv, searchPath: string, overrides: Env): Env {
  return {
    ...pick(source, BASE_KEYS),
    ...pick(source, EXTRA_KEYS),
    ...studioVars(source),
    PATH: searchPath,
    ...overrides,
    ELECTRON_RUN_AS_NODE: '1',
  };
}
