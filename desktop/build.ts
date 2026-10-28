import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, type BuildOptions, type Metafile } from 'esbuild';
import { linkEsbuildBinary, pruneModules, type PruneStats } from './prune.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = path.join(ROOT, 'build', 'desktop');
const UI_MARKER = path.join(ROOT, 'dist', 'ui', 'index.html');
const UI_SOURCES = ['src/ui', 'src/shared', 'index.html', 'vite.ui.config.ts'];
const TEMPLATE_DIR = path.join(ROOT, 'src', 'server', 'templates', 'react-vite');
const TEMPLATE_CACHE = path.join(ROOT, 'build', 'react-template-cache');
const FIRST_RUN_STATIC = ['first-run.html', 'first-run.css'];
const NOT_SHIPPED = new Set(['playwright-core']);
const NOT_SHIPPED_PATTERNS = [/^@anthropic-ai\/claude-agent-sdk-(darwin|linux|win32)-/];
const WEBSITE_READER_PACKAGES = ['playwright-core'];
const WEBSITE_READER_SKIP = [path.join('lib', 'vite')];
const SLIM_GIT_FILES = ['bin/git', 'libexec/git-core/git', 'share/git-core/templates', 'etc/gitconfig'];

export const STAGE_APP = path.join(STAGE, 'app');
export const STAGE_RESOURCES = path.join(STAGE, 'resources');

const NODE_COMMON: BuildOptions = { bundle: true, platform: 'node', target: 'node24', sourcemap: true, logLevel: 'warning' };
const ESM_REQUIRE_BANNER = { js: "import { createRequire as __studioCreateRequire } from 'node:module'; const require = __studioCreateRequire(import.meta.url);" };

function newestMtime(target: string): number {
  if (!existsSync(target)) return 0;
  const stat = statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  return readdirSync(target).reduce((latest, name) => Math.max(latest, newestMtime(path.join(target, name))), stat.mtimeMs);
}

function uiIsStale(): boolean {
  if (!existsSync(UI_MARKER)) return true;
  const built = statSync(UI_MARKER).mtimeMs;
  return UI_SOURCES.some((source) => newestMtime(path.join(ROOT, source)) > built);
}

export function ensureUi(): void {
  if (!uiIsStale()) return;
  console.log('[desktop] building UI');
  execFileSync('npm', ['run', 'build:ui'], { cwd: ROOT, stdio: 'inherit' });
}

export async function buildDesktopApp(outDir: string, release = false): Promise<void> {
  const desktop = path.join(ROOT, 'desktop');
  const electronCommon: BuildOptions = { ...NODE_COMMON, external: ['electron'], define: { __STUDIO_RELEASE__: release ? 'true' : 'false' } };
  await build({ ...electronCommon, entryPoints: [path.join(desktop, 'main.ts')], outfile: path.join(outDir, 'main.js'), format: 'esm', banner: ESM_REQUIRE_BANNER });
  await build({ ...electronCommon, entryPoints: [path.join(desktop, 'preload.cts')], outfile: path.join(outDir, 'preload.cjs'), format: 'cjs' });
  await build({ ...electronCommon, entryPoints: [path.join(desktop, 'first-run-preload.cts')], outfile: path.join(outDir, 'first-run-preload.cjs'), format: 'cjs' });
  await build({ ...electronCommon, entryPoints: [path.join(desktop, 'render-host.ts')], outfile: path.join(outDir, 'render-host.js'), format: 'esm', banner: ESM_REQUIRE_BANNER });
  await build({ bundle: true, platform: 'browser', target: 'es2022', format: 'iife', logLevel: 'warning', entryPoints: [path.join(desktop, 'first-run-page.ts')], outfile: path.join(outDir, 'first-run.js') });
  for (const file of FIRST_RUN_STATIC) cpSync(path.join(desktop, file), path.join(outDir, file));
}

async function buildServer(serverDir: string): Promise<Metafile[]> {
  const common: BuildOptions = { ...NODE_COMMON, format: 'esm', packages: 'external', metafile: true };
  const server = await build({ ...common, entryPoints: [path.join(ROOT, 'src', 'server', 'index.ts')], outfile: path.join(serverDir, 'index.js') });
  const runner = await build({ ...common, entryPoints: [path.join(ROOT, 'src', 'server', 'preview', 'vite-runner.ts')], outfile: path.join(serverDir, 'vite-runner.js') });
  const routeGraph = await build({ ...common, entryPoints: [path.join(ROOT, 'src', 'server', 'preview', 'route-graph-worker.ts')], outfile: path.join(serverDir, 'route-graph-worker.js') });
  const thumbnails = await build({ ...common, entryPoints: [path.join(ROOT, 'src', 'server', 'thumbnail-worker.ts')], outfile: path.join(serverDir, 'thumbnail-worker.js') });
  writeFileSync(path.join(serverDir, 'package.json'), `${JSON.stringify({ name: 'design-studio-server', private: true, type: 'module' }, null, 2)}\n`);
  return [server.metafile, runner.metafile, routeGraph.metafile, thumbnails.metafile].filter((meta): meta is Metafile => meta !== undefined);
}

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? specifier);
}

export function importedPackages(metafiles: Metafile[]): string[] {
  const names = new Set<string>();
  for (const meta of metafiles) {
    for (const output of Object.values(meta.outputs)) {
      for (const entry of output.imports) if (entry.external && !entry.path.startsWith('node:')) names.add(packageName(entry.path));
    }
  }
  return [...names].filter(isShipped).sort();
}

export function isShipped(name: string): boolean {
  return !NOT_SHIPPED.has(name) && !NOT_SHIPPED_PATTERNS.some((pattern) => pattern.test(name));
}

function resolvePackageDir(name: string, fromDir: string): string | null {
  let dir = fromDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (dir === ROOT || path.dirname(dir) === dir) return null;
    dir = path.dirname(dir);
  }
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

function runtimeDependencies(dir: string): string[] {
  const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as PackageManifest;
  const peers = Object.keys(manifest.peerDependencies ?? {}).filter((name) => !manifest.peerDependenciesMeta?.[name]?.optional);
  return [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {}), ...peers];
}

export function dependencyClosure(names: string[]): string[] {
  const seen = new Set<string>();
  const queue = names.filter(isShipped).map((name) => resolvePackageDir(name, ROOT)).filter((dir): dir is string => dir !== null);
  while (queue.length > 0) {
    const dir = queue.pop() as string;
    if (seen.has(dir)) continue;
    seen.add(dir);
    for (const name of runtimeDependencies(dir).filter(isShipped)) {
      const found = resolvePackageDir(name, dir);
      if (found && !seen.has(found)) queue.push(found);
    }
  }
  return [...seen].sort();
}

async function buildBridge(file: string): Promise<void> {
  const entry = path.join(ROOT, 'src', 'bridge', 'bridge.ts');
  await build({ entryPoints: [entry], bundle: true, format: 'iife', minify: true, platform: 'browser', target: ['es2020'], outfile: file, logLevel: 'warning' });
}

function copyPackage(source: string, target: string): void {
  cpSync(source, target, {
    recursive: true,
    verbatimSymlinks: true,
    filter: (entry) => !path.relative(source, entry).split(path.sep).includes('node_modules'),
  });
}

function copyWebsiteReader(serverDir: string, modulesRoot: string): number {
  const dirs = WEBSITE_READER_PACKAGES.map((name) => resolvePackageDir(name, ROOT)).filter((dir): dir is string => dir !== null);
  for (const dir of dirs) {
    cpSync(dir, path.join(serverDir, 'node_modules', path.relative(modulesRoot, dir)), {
      recursive: true,
      verbatimSymlinks: true,
      filter: (entry) => {
        const relative = path.relative(dir, entry);
        return !relative.split(path.sep).includes('node_modules') && !WEBSITE_READER_SKIP.some((skip) => relative === skip || relative.startsWith(`${skip}${path.sep}`));
      },
    });
  }
  return dirs.length;
}

function copyServerModules(serverDir: string, metafiles: Metafile[]): number {
  const modulesRoot = path.join(ROOT, 'node_modules');
  const dirs = dependencyClosure(importedPackages(metafiles));
  for (const dir of dirs) copyPackage(dir, path.join(serverDir, 'node_modules', path.relative(modulesRoot, dir)));
  return dirs.length + copyWebsiteReader(serverDir, modulesRoot);
}

function copySlimGit(target: string): void {
  const source = path.join(ROOT, 'node_modules', 'dugite', 'git');
  for (const file of SLIM_GIT_FILES) cpSync(path.join(source, file), path.join(target, file), { recursive: true, verbatimSymlinks: true });
}

function prebuiltTemplate(target: string): void {
  const pkg = readFileSync(path.join(TEMPLATE_DIR, 'package.json'), 'utf8');
  const cachedPkg = path.join(TEMPLATE_CACHE, 'package.json');
  if (!existsSync(cachedPkg) || readFileSync(cachedPkg, 'utf8') !== pkg || !existsSync(path.join(TEMPLATE_CACHE, 'node_modules'))) {
    rmSync(TEMPLATE_CACHE, { recursive: true, force: true });
    mkdirSync(TEMPLATE_CACHE, { recursive: true });
    writeFileSync(cachedPkg, pkg);
    execFileSync('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], { cwd: TEMPLATE_CACHE, stdio: 'inherit' });
  }
  mkdirSync(target, { recursive: true });
  writeFileSync(path.join(target, 'package.json'), pkg);
  cpSync(path.join(TEMPLATE_CACHE, 'node_modules'), path.join(target, 'node_modules'), { recursive: true, verbatimSymlinks: true });
}

function copyStatic(resources: string): void {
  cpSync(path.join(ROOT, 'dist', 'ui'), path.join(resources, 'ui'), { recursive: true });
  cpSync(path.join(ROOT, 'src', 'server', 'design-system', 'packs'), path.join(resources, 'packs'), { recursive: true });
  cpSync(TEMPLATE_DIR, path.join(resources, 'templates', 'react-vite'), { recursive: true });
  cpSync(path.join(ROOT, 'src', 'server', 'templates', 'starters'), path.join(resources, 'templates', 'starters'), { recursive: true });
  cpSync(path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), path.join(resources, 'axe.min.js'));
}

function writeAppPackage(appDir: string): void {
  const root = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { version: string };
  const version = process.env.STUDIO_APP_VERSION || root.version;
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) throw new Error(`STUDIO_APP_VERSION must be a semver version, got ${version}`);
  const pkg = { name: 'design-studio', productName: 'Design Studio', version, description: 'Design Studio', author: 'Design Studio', type: 'module', main: 'main.js' };
  writeFileSync(path.join(appDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
}

function describePrune(stats: PruneStats[]): string {
  const files = stats.reduce((sum, item) => sum + item.files, 0);
  const bytes = stats.reduce((sum, item) => sum + item.bytes, 0);
  return `${files} files, ${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

export async function stagePackage(): Promise<void> {
  ensureUi();
  rmSync(STAGE, { recursive: true, force: true });
  mkdirSync(STAGE_APP, { recursive: true });
  await buildDesktopApp(STAGE_APP, process.env.STUDIO_TEST_BUILD !== '1');
  writeAppPackage(STAGE_APP);
  const serverDir = path.join(STAGE_RESOURCES, 'server');
  const metafiles = await buildServer(serverDir);
  await buildBridge(path.join(STAGE_RESOURCES, 'bridge.js'));
  copyStatic(STAGE_RESOURCES);
  copySlimGit(path.join(STAGE_RESOURCES, 'git'));
  const packages = copyServerModules(serverDir, metafiles);
  prebuiltTemplate(path.join(STAGE_RESOURCES, 'react-template'));
  const serverModules = path.join(serverDir, 'node_modules');
  const templateModules = path.join(STAGE_RESOURCES, 'react-template', 'node_modules');
  const pruned = [pruneModules(serverModules, { keepTypes: false }), pruneModules(templateModules, { keepTypes: true }), linkEsbuildBinary(serverModules), linkEsbuildBinary(templateModules)];
  console.log(`[desktop] staged app and resources in ${STAGE} (${packages} server packages, pruned ${describePrune(pruned)})`);
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  stagePackage().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
