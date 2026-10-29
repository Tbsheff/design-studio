export interface UsageRoute {
  route: string;
  file: string;
}

export interface ComponentUsage {
  file: string;
  component: string | null;
  routes: UsageRoute[];
}

export type EditScopeChoice = 'this' | 'all';

export interface EditScope {
  choice: EditScopeChoice;
  file: string;
  component: string | null;
  routes: string[];
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
  return { choice, file, component: shortText(value.component), routes };
}

export function editScopeOf(request: object): EditScope | undefined {
  return parseEditScope((request as { editScope?: unknown }).editScope);
}
