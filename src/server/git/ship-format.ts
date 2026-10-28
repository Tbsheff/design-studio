import { constants } from 'node:fs';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { ShipFormat, ShipFormatResult, ShipFormatTool } from '../../shared/ship.js';
import { WRITE_TIMEOUT_MS, execTool } from './user-git.js';

const BIOME_CONFIGS = ['biome.json', 'biome.jsonc'];
const PRETTIER_CONFIG = /^(\.prettierrc(\.(json|ya?ml|json5|js|cjs|mjs|toml))?|prettier\.config\.(js|cjs|mjs|ts))$/;
const ESLINT_CONFIG = /^(\.eslintrc(\.(json|ya?ml|js|cjs))?|eslint\.config\.(js|cjs|mjs|ts))$/;
const OXLINT_CONFIG = /^\.oxlintrc(\.[a-z]+)?\.json$/;
const LINT_STAGED_CONFIG = /^(\.lintstagedrc(\.(json|ya?ml|js|cjs|mjs))?|lint-staged\.config\.(js|cjs|mjs|ts))$/;
const BIOME_FILES = /\.(m?[jt]sx?|c[jt]s|jsonc?|css|graphql|gql)$/i;
const PRETTIER_FILES = /\.(m?[jt]sx?|c[jt]s|jsonc?|css|s[ac]ss|less|html|vue|md|mdx|ya?ml|graphql|gql)$/i;
const BIOME_ARGS = ['check', '--write', '--formatter-enabled=true', '--linter-enabled=false', '--assist-enabled=true'];

async function isExecutable(file: string): Promise<boolean> {
  return access(file, constants.X_OK).then(
    () => true,
    () => false,
  );
}

async function names(dir: string): Promise<string[]> {
  return readdir(dir).catch(() => [] as string[]);
}

async function packageJson(dir: string): Promise<Record<string, unknown>> {
  return readFile(path.join(dir, 'package.json'), 'utf8')
    .then((text) => JSON.parse(text) as Record<string, unknown>)
    .catch(() => ({}));
}

function configDirs(root: string, prefix: string): string[] {
  const parts = prefix.split('/').filter(Boolean);
  const dirs = parts.map((_part, index) => path.join(root, ...parts.slice(0, parts.length - index)));
  return [...dirs, root];
}

async function binaryIn(dirs: string[], name: string): Promise<string | null> {
  for (const dir of dirs) {
    const file = path.join(dir, 'node_modules', '.bin', name);
    if (await isExecutable(file)) return file;
  }
  return null;
}

interface RepoConfigs {
  files: Set<string>;
  pkg: Record<string, unknown>;
}

async function repoConfigs(dirs: string[]): Promise<RepoConfigs> {
  const files = new Set<string>();
  let pkg: Record<string, unknown> = {};
  for (const dir of dirs) {
    for (const name of await names(dir)) files.add(name);
    pkg = { ...(await packageJson(dir)), ...pkg };
  }
  return { files, pkg };
}

function hasConfig(configs: RepoConfigs, test: RegExp | string[], key?: string): boolean {
  const byName = Array.isArray(test) ? test.some((name) => configs.files.has(name)) : [...configs.files].some((name) => test.test(name));
  return byName || (key !== undefined && key in configs.pkg);
}

async function pickTool(dirs: string[], configs: RepoConfigs): Promise<{ tool: ShipFormatTool; binary: string } | null> {
  if (hasConfig(configs, BIOME_CONFIGS)) {
    const binary = await binaryIn(dirs, 'biome');
    if (binary) return { tool: 'biome', binary };
  }
  if (hasConfig(configs, PRETTIER_CONFIG, 'prettier')) {
    const binary = await binaryIn(dirs, 'prettier');
    if (binary) return { tool: 'prettier', binary };
  }
  return null;
}

async function skippedHooks(root: string, configs: RepoConfigs): Promise<string[]> {
  const out: string[] = [];
  const husky = await names(path.join(root, '.husky'));
  for (const hook of ['pre-commit', 'commit-msg', 'pre-push']) if (husky.includes(hook)) out.push(`husky ${hook}`);
  const gitHooks = (await names(path.join(root, '.git', 'hooks'))).filter((name) => !name.endsWith('.sample'));
  if (husky.length === 0 && gitHooks.length > 0) out.push(`git hooks (${gitHooks.join(', ')})`);
  if (hasConfig(configs, LINT_STAGED_CONFIG, 'lint-staged')) out.push('lint-staged');
  if (hasConfig(configs, ESLINT_CONFIG, 'eslintConfig')) out.push('eslint');
  if (hasConfig(configs, OXLINT_CONFIG)) out.push('oxlint');
  return out;
}

function commandOf(tool: ShipFormatTool): string {
  return tool === 'biome' ? `biome ${BIOME_ARGS.join(' ')}` : 'prettier --write';
}

function noteOf(tool: ShipFormatTool | null, skipped: string[]): string {
  const hooks = skipped.length > 0 ? `Repo hooks and linters do not run (${skipped.join(', ')}).` : 'Git hooks do not run.';
  if (!tool) return `No formatter config (biome or prettier) found, so the shipped files are not formatted. ${hooks}`;
  return `Studio formats the shipped files with ${tool === 'biome' ? 'biome (format and import sort)' : 'prettier'} from your repo before the commit. ${hooks}`;
}

export interface ShipFormatter extends ShipFormat {
  binary: string | null;
}

export async function detectShipFormat(root: string, prefix: string): Promise<ShipFormatter> {
  const dirs = configDirs(root, prefix);
  const configs = await repoConfigs(dirs);
  const picked = await pickTool(dirs, configs);
  const skipped = await skippedHooks(root, configs);
  return { tool: picked?.tool ?? null, binary: picked?.binary ?? null, command: picked ? commandOf(picked.tool) : null, skipped, note: noteOf(picked?.tool ?? null, skipped) };
}

function argsFor(tool: ShipFormatTool, repoPath: string): string[] {
  return tool === 'biome' ? [...BIOME_ARGS, `--stdin-file-path=${repoPath}`] : ['--stdin-filepath', repoPath];
}

export async function formatText(formatter: ShipFormatter, root: string, repoPath: string, text: string): Promise<string | null> {
  if (!formatter.tool || !formatter.binary) return null;
  const supported = formatter.tool === 'biome' ? BIOME_FILES : PRETTIER_FILES;
  if (!supported.test(repoPath)) return null;
  const out = await execTool(formatter.binary, argsFor(formatter.tool, repoPath), { cwd: root, input: text, timeoutMs: WRITE_TIMEOUT_MS, allowFail: true });
  if (out.code !== 0) throw new Error(out.stderr.split('\n').slice(0, 4).join(' ') || `exit ${out.code}`);
  return out.stdout.length > 0 ? out.stdout : null;
}

export function emptyFormatResult(formatter: ShipFormat): ShipFormatResult {
  return { tool: formatter.tool, formatted: [], errors: [], skipped: formatter.skipped, note: formatter.note };
}
