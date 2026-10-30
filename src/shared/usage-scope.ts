export interface UsageRoute {
  route: string;
  file: string;
}

export type CallSiteKind = 'page' | 'component' | 'layout';

export interface UsageCallSite {
  file: string;
  kind: CallSiteKind;
  routes: number;
  routeLocal: boolean;
  pageFile: string | null;
}

export interface ComponentUsage {
  file: string;
  component: string | null;
  routes: UsageRoute[];
  callSite?: UsageCallSite;
}

export type EditScopeChoice = 'this' | 'all';

export interface EditScopeSite {
  file: string;
  kind: CallSiteKind;
  pageFile: string | null;
}

export interface EditScope {
  choice: EditScopeChoice;
  file: string;
  component: string | null;
  routes: string[];
  callSite?: EditScopeSite;
}

export interface InlineRunExtras {
  lean: true;
  editScope?: EditScope;
}

export const EDIT_SCOPE_ROUTES_MAX = 50;
const TEXT_MAX = 300;

function shortText(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() !== '' && raw.length <= TEXT_MAX ? raw.trim() : null;
}

export function parseEditScope(raw: unknown): EditScope | undefined {
  if (raw === undefined || raw === null || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const choice = value.choice === 'this' || value.choice === 'all' ? value.choice : null;
  const file = shortText(value.file);
  if (!choice || !file) return undefined;
  const routes = Array.isArray(value.routes) ? value.routes.map(shortText).filter((route): route is string => route !== null).slice(0, EDIT_SCOPE_ROUTES_MAX) : [];
  const callSite = parseSite(value.callSite);
  return { choice, file, component: shortText(value.component), routes, ...(callSite ? { callSite } : {}) };
}

function parseSite(raw: unknown): EditScopeSite | undefined {
  if (raw === undefined || raw === null || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const file = shortText(value.file);
  const kind = value.kind === 'page' || value.kind === 'component' || value.kind === 'layout' ? value.kind : null;
  if (!file || !kind) return undefined;
  return { file, kind, pageFile: shortText(value.pageFile) };
}

export function isSharedLayout(site: UsageCallSite | undefined): boolean {
  return site?.kind === 'layout' && !site.routeLocal;
}

export function editScopeOf(request: object): EditScope | undefined {
  return parseEditScope((request as { editScope?: unknown }).editScope);
}
