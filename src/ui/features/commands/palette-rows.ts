import {
  TYPE_LABELS,
  type ProjectHit,
  type ProjectType,
  type RouteHit,
} from "../../../shared/project-search";
import type { IconName } from "../../kit/Icon";
import { rank, type Ranked } from "./fuzzy";
import type { Command } from "./registry";

export type RowKind = "command" | "project" | "route" | "new";

export interface Row {
  key: string;
  kind: RowKind;
  group: string;
  title: string;
  marks: number[];
  run: () => void;
  meta?: string;
  icon?: IconName;
  tone?: "brand" | "accent";
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
  mac: boolean;
  actions: RowActions;
}

const GROUP_ORDER = [
  "Run",
  "Canvas",
  "View",
  "Panels",
  "Selection",
  "Version",
  "Go",
  "Help",
];

const RECENT_PROJECTS = 5;
const RECENT_IN_STUDIO = 4;
const SUGGESTED_IDS = new Set(["project.new", "project.open-folder"]);

const CONTEXT_IDS = [
  "tool.select",
  "tool.comment",
  "panel.versions",
  "version.export",
];

const MAX_PROJECTS = 6;
const MAX_ACTIONS = 12;
const STRONG = 10;

export function typePair(type: ProjectType): string {
  return TYPE_LABELS[type];
}

function markRuns(marks: number[]): number {
  return marks.filter((at, i) => i === 0 || at !== (marks[i - 1] ?? 0) + 1)
    .length;
}

function clean<T>(list: Ranked<T>[], query: string): Ranked<T>[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean).length;

  return list.filter((r) => markRuns(r.marks) <= tokens);
}

function groupIndex(group: string): number {
  const at = GROUP_ORDER.indexOf(group);

  return at === -1 ? GROUP_ORDER.length : at;
}

function projectMeta(hit: ProjectHit): string | undefined {
  if (hit.health?.level === "warn") {
    return hit.health.note;
  }

  return hit.place ?? undefined;
}

function projectRow(
  hit: ProjectHit,
  group: string,
  actions: RowActions,
  marks: number[] = [],
  keys?: string
): Row {
  const meta = projectMeta(hit);

  return {
    key: `p:${hit.id}`,
    kind: "project",
    group,
    title: hit.name,
    marks,
    hit,
    run: () => actions.openProject(hit.id),
    ...(meta ? { meta } : {}),
    ...(keys ? { keys } : {}),
  };
}

function commandRow(
  command: Command,
  group: string,
  marks: number[] = [],
  note?: string
): Row {
  return {
    key: `c:${command.id}`,
    kind: "command",
    group,
    title: command.title,
    marks,
    run: command.run,
    icon: command.icon ?? "dot",
    commandId: command.id,
    ...(command.disabled ? { disabled: command.disabled } : {}),
    ...(note ? { note } : {}),
  };
}

function contextCommands(input: RowInput): Command[] {
  if (!input.current) {
    return [];
  }

  const byId = new Map(input.commands.map((c) => [c.id, c]));

  return CONTEXT_IDS.map((id) => byId.get(id)).filter(
    (c): c is Command => c !== undefined && !c.disabled
  );
}

function suggested(input: RowInput, context: Command[]): Row[] {
  const byId = new Map(input.commands.map((c) => [c.id, c]));
  const make = byId.get("project.new");
  const open = byId.get("project.open-folder");
  const rows: Row[] = context.map((c) => commandRow(c, "Suggested"));

  if (make) {
    rows.push({
      ...commandRow(make, "Suggested"),
      title: "New prototype",
      meta: "Describe it next",
      icon: "sparkle",
      tone: "brand",
      ...(input.desktop ? { keys: "Mod+N" } : {}),
    });
  }

  if (open) {
    rows.push({
      ...commandRow(open, "Suggested"),
      title: "Open app folder…",
      meta: "Next.js, Vite or HTML",
      icon: "folder",
      tone: "accent",
      ...(input.desktop ? { keys: "Mod+O" } : {}),
    });
  }

  return rows;
}

function emptyRows(input: RowInput): Row[] {
  const others = input.projects.filter((p) => p.id !== input.current);
  const context = contextCommands(input);

  const recentProjects = others
    .slice(0, context.length > 0 ? RECENT_IN_STUDIO : RECENT_PROJECTS)
    .map((hit, i) =>
      projectRow(
        hit,
        "Recent",
        input.actions,
        [],
        input.mac ? `Ctrl+${i + 1}` : undefined
      )
    );

  const contextIds = new Set(context.map((c) => c.id));

  const commands = input.commands.filter(
    (c) => !SUGGESTED_IDS.has(c.id) && !contextIds.has(c.id)
  );

  const byId = new Map(commands.map((c) => [c.id, c]));

  const top = input.recent
    .map((id) => byId.get(id))
    .filter((c): c is Command => c !== undefined && !c.disabled);

  const topIds = new Set(top.map((c) => c.id));

  const rest = commands
    .filter((c) => !topIds.has(c.id))
    .sort((a, b) => groupIndex(a.group) - groupIndex(b.group));

  return [
    ...recentProjects,
    ...suggested(input, context),
    ...top.map((c) => commandRow(c, "Recent commands")),
    ...rest.map((c) => commandRow(c, c.group)),
  ];
}

function newRow(query: string, actions: RowActions): Row {
  const text = query.trim();

  return {
    key: "new",
    kind: "new",
    group: "New",
    title: `New prototype: “${text}”`,
    marks: [],
    icon: "sparkle",
    tone: "brand",
    meta: `${typePair("html")} · starts an AI run`,
    run: () => actions.newPrototype(text),
  };
}

interface Scored {
  rows: Row[];
  best: number;
}

function routeRow(r: RouteHit, input: RowInput, marks: number[]): Row {
  return {
    key: `r:${r.projectId}:${r.route}`,
    kind: "route",
    group: `Routes in ${r.projectName}`,
    title: r.route,
    marks,
    meta: r.file,
    icon: "link",
    run: () => input.actions.openProject(r.projectId, r.route),
  };
}

function routeRows(input: RowInput): Scored {
  const usable = input.routes.filter((r) => !r.dynamic);
  const query = input.query.replace(/^\//, "");

  const ranked = clean(
    rank(usable, query, (r) => ({ title: r.route })),
    query
  );

  if (ranked.length > 0) {
    return {
      rows: ranked.map((r) => routeRow(r.item, input, r.marks)),
      best: ranked[0]?.score ?? 0,
    };
  }

  const named = new Set(
    clean(
      rank(input.projects, input.query, (p) => ({ title: p.name })),
      input.query
    ).map((r) => r.item.id)
  );

  return {
    rows: usable
      .filter((r) => named.has(r.projectId))
      .map((r) => routeRow(r, input, [])),
    best: 0,
  };
}

function looseMatches(input: RowInput): Row[] {
  const words = input.query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  if (words.length < 2) {
    return [];
  }

  const seen = new Set<string>();
  const out: Row[] = [];

  for (const word of words) {
    for (const r of clean(
      rank(input.projects, word, (p) => ({
        title: p.name,
        keywords: p.place ?? "",
      })),
      word
    )) {
      if (r.score < STRONG - 1 || seen.has(r.item.id)) {
        continue;
      }

      seen.add(r.item.id);
      out.push(projectRow(r.item, "Matches", input.actions, r.marks));
    }
  }

  return out.slice(0, 3);
}

function projectMatches(input: RowInput): Row[] {
  if (input.query.startsWith("/")) {
    return [];
  }

  const ranked = clean(
    rank(input.projects, input.query, (p) => ({
      title: p.name,
      keywords: `${p.place ?? ""} ${typePair(p.type)}`,
    })),
    input.query
  ).slice(0, MAX_PROJECTS);

  return ranked.length > 0
    ? ranked.map((r) => projectRow(r.item, "Projects", input.actions, r.marks))
    : looseMatches(input);
}

function actionMatches(input: RowInput): Scored {
  const ranked = clean(
    rank(
      input.commands.filter((c) => !SUGGESTED_IDS.has(c.id)),
      input.query,
      (c) => ({ title: c.title, keywords: `${c.keywords ?? ""} ${c.group}` })
    ),
    input.query
  )
    .map((r) => ({
      ...r,
      score:
        r.score +
        (input.recent.includes(r.item.id) ? 1 : 0) -
        (r.item.disabled ? 4 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ACTIONS);

  return {
    rows: ranked.map((r) =>
      commandRow(r.item, "Actions", r.marks, r.item.group)
    ),
    best: ranked[0]?.score ?? 0,
  };
}

function typedRows(input: RowInput): Row[] {
  const routes = routeRows(input);
  const actions = actionMatches(input);
  const actionsFirst = actions.best >= STRONG - 1 && actions.best > routes.best;

  const found = [
    ...projectMatches(input),
    ...(actionsFirst
      ? [...actions.rows, ...routes.rows]
      : [...routes.rows, ...actions.rows]),
  ];

  const make = newRow(input.query, input.actions);

  return found.length > 0 ? [...found, make] : [make];
}

export function buildRows(input: RowInput): Row[] {
  return input.query.trim() === "" ? emptyRows(input) : typedRows(input);
}
