import type { Project } from './contracts.js';

export const APP_SOURCE_PATH = '/__studio/source';
export const APP_REDIRECT_PARAM = '__studio_redirected_from';

export function isAttachedApp(project: Pick<Project, 'app'> | null | undefined): boolean {
  return Boolean(project?.app);
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
