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
