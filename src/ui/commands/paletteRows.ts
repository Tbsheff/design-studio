import type { ProjectHit, RouteHit } from '../../shared/project-search';
import type { IconName } from '../components/Icon';
import { rank } from './fuzzy';
import type { Command } from './registry';

export type RowKind = 'command' | 'project' | 'route' | 'new';

export interface Row {
  key: string;
  kind: RowKind;
  group: string;
  title: string;
  marks: number[];
  run: () => void;
  meta?: string;
  icon?: IconName;
  tone?: 'brand' | 'accent';
  hit?: ProjectHit;
  keys?: string;
  disabled?: string;
  note?: string;
  commandId?: string;
}

export interface RowActions {
  openProject: (id: string, route?: string) => void;
  newPrototype: (prompt: string) => void;
}

export interface RowInput {
  query: string;
  commands: Command[];
  projects: ProjectHit[];
  routes: RouteHit[];
  recent: string[];
  current: string | null;
  desktop: boolean;
  actions: RowActions;
}

const GROUP_ORDER = ['Run', 'Canvas', 'View', 'Panels', 'Selection', 'Version', 'Go', 'Help'];
const RECENT_PROJECTS = 5;
const SUGGESTED_IDS = new Set(['project.new', 'project.open-folder']);
const MAX_PROJECTS = 6;
const MAX_ACTIONS = 12;
const STRONG = 10;

function groupIndex(group: string): number {
  const at = GROUP_ORDER.indexOf(group);
  return at < 0 ? GROUP_ORDER.length : at;
}

function projectMeta(hit: ProjectHit): string | undefined {
  if (hit.health?.level === 'warn') return hit.health.note;
  return hit.place ?? undefined;
}

function projectRow(hit: ProjectHit, group: string, actions: RowActions, marks: number[] = [], keys?: string): Row {
  const meta = projectMeta(hit);
  return { key: `p:${hit.id}`, kind: 'project', group, title: hit.name, marks, hit, run: () => actions.openProject(hit.id), ...(meta ? { meta } : {}), ...(keys ? { keys } : {}) };
}

function commandRow(command: Command, group: string, marks: number[] = [], note?: string): Row {
  return {
    key: `c:${command.id}`,
    kind: 'command',
    group,
    title: command.title,
    marks,
    run: command.run,
    icon: command.icon ?? 'dot',
    commandId: command.id,
    ...(command.disabled ? { disabled: command.disabled } : {}),
    ...(note ? { note } : {}),
  };
}

function suggested(input: RowInput, others: ProjectHit[]): Row[] {
  const byId = new Map(input.commands.map((c) => [c.id, c]));
  const make = byId.get('project.new');
  const open = byId.get('project.open-folder');
  const rows: Row[] = [];
  if (make) rows.push({ ...commandRow(make, 'Suggested'), title: 'New prototype', meta: 'Describe it next', icon: 'sparkle', tone: 'brand', ...(input.desktop ? { keys: 'Mod+N' } : {}) });
  if (open) rows.push({ ...commandRow(open, 'Suggested'), title: 'Open app folder…', meta: 'Next.js, Vite or HTML', icon: 'folder', tone: 'accent', ...(input.desktop ? { keys: 'Mod+O' } : {}) });
  const last = others[0];
  if (last) rows.push({ key: `s:${last.id}`, kind: 'project', group: 'Suggested', title: `Switch to ${last.name}`, marks: [], icon: 'arrowRight', meta: last.place ? `Resume ${last.place}` : 'Resume', run: () => input.actions.openProject(last.id), keys: 'Mod+1' });
  return rows;
}

function emptyRows(input: RowInput): Row[] {
  const others = input.projects.filter((p) => p.id !== input.current);
  const recentProjects = others.slice(0, RECENT_PROJECTS).map((hit, i) => projectRow(hit, 'Recent', input.actions, [], `Mod+${i + 1}`));
  const commands = input.commands.filter((c) => !SUGGESTED_IDS.has(c.id));
  const byId = new Map(commands.map((c) => [c.id, c]));
  const top = input.recent.map((id) => byId.get(id)).filter((c): c is Command => c !== undefined && !c.disabled);
  const topIds = new Set(top.map((c) => c.id));
  const rest = commands.filter((c) => !topIds.has(c.id)).sort((a, b) => groupIndex(a.group) - groupIndex(b.group));
  return [...recentProjects, ...suggested(input, others), ...top.map((c) => commandRow(c, 'Recent commands')), ...rest.map((c) => commandRow(c, c.group))];
}

function newRow(query: string, actions: RowActions): Row {
  const text = query.trim();
  return { key: 'new', kind: 'new', group: 'New', title: `New prototype: “${text}”`, marks: [], icon: 'sparkle', tone: 'brand', meta: 'HTML prototype · starts an AI run', run: () => actions.newPrototype(text) };
}

function routeRows(input: RowInput, tokens: number): { rows: Row[]; strong: boolean } {
  const usable = input.routes.filter((r) => !r.dynamic);
  const ranked = rank(usable, input.query.replace(/^\//, ''), (r) => ({ title: r.route, keywords: r.file }));
  const marksOf = new Map(ranked.map((r) => [r.item, r.marks]));
  const rows = usable.map<Row>((r) => ({
    key: `r:${r.projectId}:${r.route}`,
    kind: 'route',
    group: `Routes in ${r.projectName}`,
    title: r.route,
    marks: marksOf.get(r) ?? [],
    meta: r.file,
    icon: 'link',
    run: () => input.actions.openProject(r.projectId, r.route),
  }));
  return { rows, strong: (ranked[0]?.score ?? 0) >= STRONG * tokens || (input.query.startsWith('/') && rows.length > 0) };
}

function looseMatches(input: RowInput): Row[] {
  const words = input.query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  if (words.length < 2) return [];
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const word of words) {
    for (const r of rank(input.projects, word, (p) => ({ title: p.name, keywords: p.place ?? '' }))) {
      if (r.score < STRONG || seen.has(r.item.id)) continue;
      seen.add(r.item.id);
      out.push(projectRow(r.item, 'Matches', input.actions, r.marks));
    }
  }
  return out.slice(0, 3);
}

function typedRows(input: RowInput): Row[] {
  const tokens = input.query.trim().split(/\s+/).length;
  const projects = input.query.startsWith('/') ? [] : rank(input.projects, input.query, (p) => ({ title: p.name, keywords: `${p.place ?? ''} ${p.typeLabel}` })).slice(0, MAX_PROJECTS);
  const commands = rank(input.commands.filter((c) => !SUGGESTED_IDS.has(c.id)), input.query, (c) => ({ title: c.title, keywords: `${c.keywords ?? ''} ${c.group}` }))
    .map((r) => ({ ...r, score: r.score + (input.recent.includes(r.item.id) ? 1 : 0) - (r.item.disabled ? 4 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ACTIONS);
  const routes = routeRows(input, tokens);
  const strong = (projects[0]?.score ?? 0) >= STRONG * tokens || (commands[0]?.score ?? 0) >= STRONG * tokens || routes.strong;
  const found = [
    ...(projects.length > 0 ? projects.map((r) => projectRow(r.item, 'Projects', input.actions, r.marks)) : looseMatches(input)),
    ...routes.rows,
    ...commands.map((r) => commandRow(r.item, 'Actions', r.marks, r.item.group)),
  ];
  const make = newRow(input.query, input.actions);
  return strong ? [...found, make] : [make, ...found];
}

export function buildRows(input: RowInput): Row[] {
  return input.query.trim() === '' ? emptyRows(input) : typedRows(input);
}
