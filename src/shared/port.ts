export const PORT_TASK = 'port';
export type PortTask = typeof PORT_TASK;
export const PORT_LEVEL_LABEL = 'Port to app';
export const PORT_OPEN_EVENT = 'studio:port-to-app';

export type PortKitRole = 'card' | 'badge' | 'button' | 'input' | 'table' | 'tabs' | 'avatar' | 'separator';

export interface PortSection {
  tag: string;
  label: string;
  heading: string | null;
  texts: string[];
}

export interface PortRepeat {
  role: 'card' | 'row';
  count: number;
  tag: string;
  className: string | null;
  headings: string[];
  sample: string[];
  link: string | null;
}

export interface PortImage {
  src: string;
  alt: string;
}

export interface PortLink {
  href: string;
  text: string;
}

export interface PortToken {
  name: string;
  value: string | null;
  uses: number;
  target: string | null;
}

export interface PortKitMatch {
  role: PortKitRole;
  name: string;
  import: string;
  file: string;
  parts: string[];
  reason: string;
}

export interface PortKitMiss {
  role: PortKitRole;
  reason: string;
}

export interface PortTarget {
  projectId: string;
  name: string;
  framework: 'next' | 'vite' | null;
  route: string | null;
  routeFile: string | null;
  routeExists: boolean;
}

export interface PortPlan {
  source: { projectId: string; directionId: string; path: string; title: string | null };
  target: PortTarget | null;
  sections: PortSection[];
  steps: string[];
  currentStep: string | null;
  repeats: PortRepeat[];
  headings: string[];
  actions: string[];
  images: PortImage[];
  links: PortLink[];
  tokens: PortToken[];
  rawColors: number;
  inlineStyles: number;
  skipped: string[];
  kit: PortKitMatch[];
  missing: PortKitMiss[];
}

export interface PortFlowPage {
  path: string;
  title: string | null;
  route: string;
  url: string;
  routeFile: string | null;
  routeExists: boolean;
  plan: PortPlan;
}

export type PortFlowLinkKind = 'a' | 'form' | 'script';

export interface PortFlowLink {
  from: string;
  kind: PortFlowLinkKind;
  href: string;
  page: string;
  to: string;
  ported: boolean;
}

export interface PortFlowPlan {
  source: { projectId: string; directionId: string; entry: string };
  target: Omit<PortTarget, 'route' | 'routeFile' | 'routeExists'> | null;
  base: string | null;
  pages: PortFlowPage[];
  links: PortFlowLink[];
  unselected: string[];
  unreached: string[];
}

export interface PortStartRequest {
  sourceProjectId: string;
  sourceDirectionId?: string;
  path: string;
  paths?: string[];
  targetProjectId: string;
  route: string;
}

export interface PortStartResult {
  runId: string;
  projectId: string;
  directionId: string;
  route: string;
  routeFile: string | null;
  routes?: { path: string; route: string; routeFile: string | null }[];
}

export const PORT_FLOW_MAX_PAGES = 8;

export function portPageSlug(pagePath: string): string {
  const stem = pagePath.replace(/^.*\//, '').replace(/\.html?$/i, '');
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page';
}

const ROUTE_PART = /^[a-z0-9][a-z0-9-]{0,47}$|^\([a-z0-9-]{1,40}\)$|^\[[a-zA-Z0-9_]{1,40}\]$/;

export function cleanPortRoute(raw: string): string | null {
  const parts = raw.trim().replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 0 || parts.length > 6) return null;
  if (!parts.every((part) => ROUTE_PART.test(part))) return null;
  return `/${parts.join('/')}`;
}

export function suggestPortRoute(pagePath: string, title: string | null): string {
  const stem = pagePath.replace(/^.*\//, '').replace(/\.html?$/i, '');
  const base = stem && stem !== 'index' ? stem : (title?.split(/\s[·|–—-]\s/)[0] ?? 'prototype');
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `/${slug || 'prototype'}`;
}
