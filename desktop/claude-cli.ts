import { execFile } from 'node:child_process';
import { accessSync, constants, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

export interface ClaudeFs {
  isExecutable(file: string): boolean;
  realpath(file: string): string;
}

export type ClaudeSource = 'env' | 'path' | 'known' | 'bundled';

export interface ClaudeLocation {
  path: string;
  realPath: string;
  source: ClaudeSource;
}

export interface ResolveInputs {
  env: NodeJS.ProcessEnv;
  home: string;
  searchPath: string[];
}

export type VersionFit = 'ok' | 'older' | 'newer' | 'unknown';

const VERSION_TIMEOUT_MS = 10_000;
const SDK_PACKAGE = path.join('@anthropic-ai', 'claude-agent-sdk', 'package.json');

export const nodeFs: ClaudeFs = {
  isExecutable(file) {
    try {
      if (!statSync(file).isFile()) return false;
      accessSync(file, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  },
  realpath: (file) => realpathSync(file),
};

export function knownClaudeLocations(home: string, env: NodeJS.ProcessEnv): string[] {
  const npmPrefix = env.NPM_CONFIG_PREFIX || env.npm_config_prefix;
  return [
    path.join(home, '.local', 'bin', 'claude'),
    path.join(home, '.claude', 'local', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    path.join(home, '.npm-global', 'bin', 'claude'),
    ...(npmPrefix ? [path.join(npmPrefix, 'bin', 'claude')] : []),
  ];
}

export function claudeCandidates(inputs: ResolveInputs): { file: string; source: ClaudeSource }[] {
  const fromPath = inputs.searchPath.filter((dir) => path.isAbsolute(dir)).map((dir) => ({ file: path.join(dir, 'claude'), source: 'path' as const }));
  const known = knownClaudeLocations(inputs.home, inputs.env).map((file) => ({ file, source: 'known' as const }));
  const seen = new Set<string>();
  return [...fromPath, ...known].filter((candidate) => {
    if (seen.has(candidate.file)) return false;
    seen.add(candidate.file);
    return true;
  });
}

function locate(file: string, source: ClaudeSource, fs: ClaudeFs): ClaudeLocation | null {
  if (!fs.isExecutable(file)) return null;
  try {
    return { path: file, realPath: fs.realpath(file), source };
  } catch {
    return null;
  }
}

export function resolveClaude(inputs: ResolveInputs, fs: ClaudeFs = nodeFs): ClaudeLocation | null {
  const override = inputs.env.STUDIO_CLAUDE_PATH;
  if (override) return locate(path.resolve(override), 'env', fs);
  for (const candidate of claudeCandidates(inputs)) {
    const found = locate(candidate.file, candidate.source, fs);
    if (found) return found;
  }
  return null;
}

export function bundledClaude(file: string, fs: ClaudeFs = nodeFs): ClaudeLocation | null {
  return locate(file, 'bundled', fs);
}

export function parseVersion(text: string): [number, number, number] | null {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(text);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function compareClaudeVersion(found: string | null, expected: string | null): VersionFit {
  const have = found ? parseVersion(found) : null;
  const want = expected ? parseVersion(expected) : null;
  if (!have || !want) return 'unknown';
  if (have[0] !== want[0]) return have[0] < want[0] ? 'older' : 'newer';
  if (have[1] !== want[1]) return have[1] < want[1] ? 'older' : 'newer';
  return 'ok';
}

export function expectedClaudeVersion(modulesDir: string, read: (file: string) => string = (file) => readFileSync(file, 'utf8')): string | null {
  try {
    const manifest = JSON.parse(read(path.join(modulesDir, SDK_PACKAGE))) as { claudeCodeVersion?: unknown };
    return typeof manifest.claudeCodeVersion === 'string' ? manifest.claudeCodeVersion : null;
  } catch {
    return null;
  }
}

export function claudeVersion(binary: string, env: Record<string, string>): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(binary, ['--version'], { env, timeout: VERSION_TIMEOUT_MS }, (error, stdout) => {
      const parsed = parseVersion(String(stdout ?? ''));
      resolve(error || !parsed ? null : parsed.join('.'));
    });
  });
}
