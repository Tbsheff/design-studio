import type { Project, SelectionContext, SourceLoc } from './contracts.js';

export const APP_SOURCE_PATH = '/__studio/source';
export const APP_REDIRECT_PARAM = '__studio_redirected_from';

export function isAttachedApp(project: Pick<Project, 'app'> | null | undefined): boolean {
  return Boolean(project?.app);
}

export interface SharedSource {
  file: string;
  name: string | null;
  use: SourceLoc | null;
}

export function isOutsideAppDir(file: string, appDir: string): boolean {
  const dir = appDir.replace(/^\.\/?/, '').replace(/\/+$/, '');
  return dir !== '' && file !== dir && !file.startsWith(`${dir}/`);
}

export function sharedSourceOf(selection: Pick<SelectionContext, 'source' | 'usedAt' | 'usedBy'>, appDir: string): SharedSource | null {
  const source = selection.source;
  if (!source || !isOutsideAppDir(source.file, appDir)) return null;
  const name = selection.usedBy?.name ?? null;
  return { file: source.file, name, use: selection.usedAt && name && selection.usedBy?.root ? selection.usedAt : null };
}

export function cleanRoute(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length > 500 || /[\s\\]/.test(trimmed) || trimmed.includes('..') || /^[a-z]+:/i.test(trimmed) || trimmed.startsWith('//')) return null;
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/{2,}/g, '/');
}

export function routeLabel(route: string): string {
  if (route === '/' || route === '') return 'Home';
  const last = route.split('?')[0]?.split('/').filter(Boolean).pop() ?? route;
  return last.replace(/[-_]+/g, ' ').replace(/^\w/, (char) => char.toUpperCase()).slice(0, 40);
}

export function parseEnvText(text: string): { env: Record<string, string>; bad: string[] } {
  const env: Record<string, string> = {};
  const bad: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match?.[1]) env[match[1]] = (match[2] ?? '').replace(/^(['"])(.*)\1$/, '$2');
    else bad.push(line);
  }
  return { env, bad };
}

export function envText(env: Record<string, string> | undefined): string {
  return Object.entries(env ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export const DEV_CHROME_SELECTOR = 'nextjs-portal, next-route-announcer, [data-nextjs-toast], [data-nextjs-dev-tools-button], [data-next-badge-root], [data-nextjs-dialog-overlay], #__next-build-watcher, #__next-route-announcer__';
