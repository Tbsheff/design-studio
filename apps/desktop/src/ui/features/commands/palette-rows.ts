import { TYPE_LABELS } from "./deps.js";
import type { IconName, ProjectHit, ProjectType, RouteHit } from "./deps.js";
import { rank } from "./fuzzy.js";
import type { Ranked } from "./fuzzy.js";
import type { Command } from "./registry.js";

type RowKind = "command" | "project" | "route" | "new";

interface Row {
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

interface RowActions {
  openProject: (id: string, route?: string) => void;
  newPrototype: (prompt: string) => void;
}

interface RowInput {
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

const typePair = (type: ProjectType): string => TYPE_LABELS[type];

const markRuns = (marks: number[]): number =>
  marks.filter((at, i) => i === 0 || at !== (marks[i - 1] ?? 0) + 1).length;

const clean = <T>(list: Ranked<T>[], query: string): Ranked<T>[] => {
  const tokens = query.trim().split(/\s+/u).filter(Boolean).length;

  return list.filter((r) => markRuns(r.marks) <= tokens);
};

const groupIndex = (group: string): number => {
  const at = GROUP_ORDER.indexOf(group);

  return at === -1 ? GROUP_ORDER.length : at;
};

const projectMeta = (hit: ProjectHit): string | undefined => {
  if (hit.health?.level === "warn") {
    return hit.health.note;
  }

  return hit.place ?? undefined;
};

const projectRow = (
  hit: ProjectHit,
  group: string,
  actions: RowActions,
  { marks = [], keys }: { marks?: number[]; keys?: string } = {}
): Row => {
  const meta = projectMeta(hit);

  return {
    group,
    hit,
    key: `p:${hit.id}`,
    kind: "project",
    marks,
    run: () => actions.openProject(hit.id),
    title: hit.name,
    ...(meta ? { meta } : {}),
    ...(keys ? { keys } : {}),
  };
};

const commandRow = (
  command: Command,
  group: string,
  marks: number[] = [],
  note?: string
): Row => ({
  commandId: command.id,
  group,
  icon: command.icon ?? "dot",
  key: `c:${command.id}`,
  kind: "command",
  marks,
  run: command.run,
  title: command.title,
  ...(command.disabled ? { disabled: command.disabled } : {}),
  ...(note ? { note } : {}),
});

const contextCommands = (input: RowInput): Command[] => {
  if (!input.current) {
    return [];
  }

  const byId = new Map(input.commands.map((c) => [c.id, c]));

  return CONTEXT_IDS.map((id) => byId.get(id)).filter(
    (c): c is Command => c !== undefined && !c.disabled
  );
};

const suggested = (input: RowInput, context: Command[]): Row[] => {
  const byId = new Map(input.commands.map((c) => [c.id, c]));
  const make = byId.get("project.new");
  const open = byId.get("project.open-folder");
  const rows: Row[] = context.map((c) => commandRow(c, "Suggested"));

  if (make) {
    rows.push({
      ...commandRow(make, "Suggested"),
      icon: "sparkle",
      meta: "Describe it next",
      title: "New prototype",
      tone: "brand",
      ...(input.desktop ? { keys: "Mod+N" } : {}),
    });
  }

  if (open) {
    rows.push({
      ...commandRow(open, "Suggested"),
      icon: "folder",
      meta: "Next.js, Vite or HTML",
      title: "Open app folder…",
      tone: "accent",
      ...(input.desktop ? { keys: "Mod+O" } : {}),
    });
  }

  return rows;
};

const emptyRows = (input: RowInput): Row[] => {
  const others = input.projects.filter((p) => p.id !== input.current);
  const context = contextCommands(input);

  const recentProjects = others
    .slice(0, context.length > 0 ? RECENT_IN_STUDIO : RECENT_PROJECTS)
    .map((hit, i) =>
      projectRow(hit, "Recent", input.actions, {
        keys: input.mac ? `Ctrl+${i + 1}` : undefined,
      })
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
};

const newRow = (query: string, actions: RowActions): Row => {
  const text = query.trim();

  return {
    group: "New",
    icon: "sparkle",
    key: "new",
    kind: "new",
    marks: [],
    meta: `${typePair("html")} · starts an AI run`,
    run: () => actions.newPrototype(text),
    title: `New prototype: “${text}”`,
    tone: "brand",
  };
};

interface Scored {
  rows: Row[];
  best: number;
}

const routeRow = (r: RouteHit, input: RowInput, marks: number[]): Row => ({
  group: `Routes in ${r.projectName}`,
  icon: "link",
  key: `r:${r.projectId}:${r.route}`,
  kind: "route",
  marks,
  meta: r.file,
  run: () => input.actions.openProject(r.projectId, r.route),
  title: r.route,
});

const routeRows = (input: RowInput): Scored => {
  const usable = input.routes.filter((r) => !r.dynamic);
  const query = input.query.replace(/^\//u, "");

  const ranked = clean(
    rank(usable, query, (r) => ({ title: r.route })),
    query
  );

  if (ranked.length > 0) {
    return {
      best: ranked[0]?.score ?? 0,
      rows: ranked.map((r) => routeRow(r.item, input, r.marks)),
    };
  }

  const named = new Set(
    clean(
      rank(input.projects, input.query, (p) => ({ title: p.name })),
      input.query
    ).map((r) => r.item.id)
  );

  return {
    best: 0,
    rows: usable
      .filter((r) => named.has(r.projectId))
      .map((r) => routeRow(r, input, [])),
  };
};

const looseMatches = (input: RowInput): Row[] => {
  const words = input.query
    .toLowerCase()
    .split(/\s+/u)
    .filter((w) => w.length >= 3);

  if (words.length < 2) {
    return [];
  }

  const seen = new Set<string>();
  const out: Row[] = [];

  for (const word of words) {
    for (const r of clean(
      rank(input.projects, word, (p) => ({
        keywords: p.place ?? "",
        title: p.name,
      })),
      word
    )) {
      if (r.score < STRONG - 1 || seen.has(r.item.id)) {
        continue;
      }

      seen.add(r.item.id);
      out.push(
        projectRow(r.item, "Matches", input.actions, { marks: r.marks })
      );
    }
  }

  return out.slice(0, 3);
};

const projectMatches = (input: RowInput): Row[] => {
  if (input.query.startsWith("/")) {
    return [];
  }

  const ranked = clean(
    rank(input.projects, input.query, (p) => ({
      keywords: `${p.place ?? ""} ${typePair(p.type)}`,
      title: p.name,
    })),
    input.query
  ).slice(0, MAX_PROJECTS);

  return ranked.length > 0
    ? ranked.map((r) =>
        projectRow(r.item, "Projects", input.actions, { marks: r.marks })
      )
    : looseMatches(input);
};

const actionMatches = (input: RowInput): Scored => {
  const ranked = clean(
    rank(
      input.commands.filter((c) => !SUGGESTED_IDS.has(c.id)),
      input.query,
      (c) => ({ keywords: `${c.keywords ?? ""} ${c.group}`, title: c.title })
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
    best: ranked[0]?.score ?? 0,
    rows: ranked.map((r) =>
      commandRow(r.item, "Actions", r.marks, r.item.group)
    ),
  };
};

const typedRows = (input: RowInput): Row[] => {
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
};

const buildRows = (input: RowInput): Row[] =>
  input.query.trim() === "" ? emptyRows(input) : typedRows(input);

export { typePair, buildRows };

export type { RowKind, Row, RowActions, RowInput };
