export const FLOW_MAX_DEPTH = 3;
export const FLOW_MAX_FRAMES = 12;
export const FLOW_PARAM_MAX = 80;

export type RouteLinkKind = 'link' | 'push' | 'form' | 'redirect';

export interface RouteLinkElement {
  tag: string;
  selector: string;
  text?: string;
}

export interface RouteLink {
  kind: RouteLinkKind;
  href: string;
  to: string | null;
  file: string;
  line: number;
  element: RouteLinkElement | null;
}

export interface RouteLinksResult {
  route: string;
  file: string | null;
  links: RouteLink[];
  scanned: number;
}

export interface FlowInput {
  routes?: string[];
  from?: string;
  depth?: number;
  params?: Record<string, string>;
}

export interface FlowFrame {
  id: string;
  route: string;
  path: string;
  added: boolean;
  state: string | null;
}

export interface FlowLinkMade {
  id: string;
  fromFrame: string;
  toFrame: string;
  kind: RouteLinkKind;
  text: string | null;
  source: string;
}

export interface FlowSkipped {
  fromRoute: string;
  href: string;
  kind: RouteLinkKind;
  source: string;
  reason: string;
}

export interface FlowResult {
  frames: FlowFrame[];
  links: FlowLinkMade[];
  skipped: FlowSkipped[];
  params: Record<string, string>;
  missingParams: string[];
  startFrame: string | null;
  cut: string[];
}

export function dynamicNames(route: string): string[] {
  return [...route.matchAll(/\[\[?(?:\.\.\.)?([^\]]+)\]\]?/g)].map((match) => match[1] as string);
}

export function cleanParams(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Za-z_][\w-]{0,40}$/.test(key) || typeof value !== 'string') continue;
    const clean = value.trim().slice(0, FLOW_PARAM_MAX);
    if (/^[\w.~-]+(?:\/[\w.~-]+)*$/.test(clean)) out[key] = clean;
  }
  return out;
}
