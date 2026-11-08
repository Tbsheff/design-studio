import { TYPE_LABELS } from "./deps.js";
import type { IconName, ProjectHit, ProjectType, RouteHit } from "./deps.js";
import { rank } from "./fuzzy.js";
import type { Ranked } from "./fuzzy.js";
import type { Command } from "./registry.js";

const WORD_MIN = 3;
const ROUTE_MAX = 3;
const DISABLED_PENALTY = 4;

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
  marks.filter((at, index) => index === 0 || at !== (marks[index - 1] ?? 0) + 1)
    .length;

const clean = <T>(list: Ranked<T>[], query: string): Ranked<T>[] => {
  const tokens = query.trim().split(/\s+/u).filter(Boolean).length;

  return list.filter((result) => markRuns(result.marks) <= tokens);
};

const groupIndex = (group: string): number => {
  const at = GROUP_ORDER.indexOf(group);

  if (at === -1) {
    return GROUP_ORDER.length;
  }

  return at;
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

  const byId = new Map(input.commands.map((char) => [char.id, char]));

  return CONTEXT_IDS.map((id) => byId.get(id)).filter(
    (ch): ch is Command => ch !== undefined && !ch.disabled
  );
};

const suggested = (input: RowInput, context: Command[]): Row[] => {
  const byId = new Map(input.commands.map((chNext) => [chNext.id, chNext]));
  const make = byId.get("project.new");
  const open = byId.get("project.open-folder");

  const rows: Row[] = context.map((charNext) =>
    commandRow(charNext, "Suggested")
  );

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
  const others = input.projects.filter(
    (projectHit) => projectHit.id !== input.current
  );
  const context = contextCommands(input);

  const recentProjects = others
    .slice(0, context.length > 0 ? RECENT_IN_STUDIO : RECENT_PROJECTS)
    .map((hit, idx) =>
      projectRow(hit, "Recent", input.actions, {
        keys: (input.mac && `Ctrl+${idx + 1}`) || undefined,
      })
    );

  const contextIds = new Set(context.map((commandNext) => commandNext.id));

  const commands = input.commands.filter(
    (commandOther) =>
      !SUGGESTED_IDS.has(commandOther.id) && !contextIds.has(commandOther.id)
  );

  const byId = new Map(
    commands.map((commandExtra) => [commandExtra.id, commandExtra])
  );

  const top = input.recent
    .map((id) => byId.get(id))
    .filter(
      (charOther): charOther is Command =>
        charOther !== undefined && !charOther.disabled
    );

  const topIds = new Set(top.map((charExtra) => charExtra.id));

  const rest = commands
    .filter((chOther) => !topIds.has(chOther.id))
    .sort(
      (first, second) => groupIndex(first.group) - groupIndex(second.group)
    );

  return [
    ...recentProjects,
    ...suggested(input, context),
    ...top.map((chExtra) => commandRow(chExtra, "Recent commands")),
    ...rest.map((commandValue) => commandRow(commandValue, commandValue.group)),
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

const routeRow = (
  routeHit: RouteHit,
  input: RowInput,
  marks: number[]
): Row => ({
  group: `Routes in ${routeHit.projectName}`,
  icon: "link",
  key: `r:${routeHit.projectId}:${routeHit.route}`,
  kind: "route",
  marks,
  meta: routeHit.file,
  run: () => input.actions.openProject(routeHit.projectId, routeHit.route),
  title: routeHit.route,
});

const routeRows = (input: RowInput): Scored => {
  const usable = input.routes.filter((rect) => !rect.dynamic);
  const query = input.query.replace(/^\//u, "");

  const ranked = clean(
    rank(usable, query, (rectNext) => ({ title: rectNext.route })),
    query
  );

  if (ranked.length > 0) {
    return {
      best: ranked[0]?.score ?? 0,
      rows: ranked.map((resultNext) =>
        routeRow(resultNext.item, input, resultNext.marks)
      ),
    };
  }

  const named = new Set(
    clean(
      rank(input.projects, input.query, (part) => ({ title: part.name })),
      input.query
    ).map((resultOther) => resultOther.item.id)
  );

  return {
    best: 0,
    rows: usable
      .filter((routeHitNext) => named.has(routeHitNext.projectId))
      .map((routeHitOther) => routeRow(routeHitOther, input, [])),
  };
};

const looseMatches = (input: RowInput): Row[] => {
  const words = input.query
    .toLowerCase()
    .split(/\s+/u)
    .filter((entry) => entry.length >= WORD_MIN);

  if (words.length < 2) {
    return [];
  }

  const seen = new Set<string>();
  const out: Row[] = [];

  for (const word of words) {
    for (const resultExtra of clean(
      rank(input.projects, word, (itemNext) => ({
        keywords: itemNext.place ?? "",
        title: itemNext.name,
      })),
      word
    )) {
      if (resultExtra.score < STRONG - 1 || seen.has(resultExtra.item.id)) {
        continue;
      }

      seen.add(resultExtra.item.id);
      out.push(
        projectRow(resultExtra.item, "Matches", input.actions, {
          marks: resultExtra.marks,
        })
      );
    }
  }

  return out.slice(0, ROUTE_MAX);
};

const projectMatches = (input: RowInput): Row[] => {
  if (input.query.startsWith("/")) {
    return [];
  }

  const ranked = clean(
    rank(input.projects, input.query, (partNext) => ({
      keywords: `${partNext.place ?? ""} ${typePair(partNext.type)}`,
      title: partNext.name,
    })),
    input.query
  ).slice(0, MAX_PROJECTS);

  if (ranked.length > 0) {
    return ranked.map((rectOther) =>
      projectRow(rectOther.item, "Projects", input.actions, {
        marks: rectOther.marks,
      })
    );
  }

  return looseMatches(input);
};

const actionMatches = (input: RowInput): Scored => {
  const ranked = clean(
    rank(
      input.commands.filter(
        (commandValue) => !SUGGESTED_IDS.has(commandValue.id)
      ),
      input.query,
      (commandValue) => ({
        keywords: `${commandValue.keywords ?? ""} ${commandValue.group}`,
        title: commandValue.title,
      })
    ),
    input.query
  )
    .map((rectExtra) => ({
      ...rectExtra,
      score:
        rectExtra.score +
        ((input.recent.includes(rectExtra.item.id) && 1) || 0) -
        (rectExtra.item.disabled ? DISABLED_PENALTY : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_ACTIONS);

  return {
    best: ranked[0]?.score ?? 0,
    rows: ranked.map((resultValue) =>
      commandRow(
        resultValue.item,
        "Actions",
        resultValue.marks,
        resultValue.item.group
      )
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

  if (found.length > 0) {
    return [...found, make];
  }

  return [make];
};

const buildRows = (input: RowInput): Row[] => {
  if (input.query.trim() === "") {
    return emptyRows(input);
  }

  return typedRows(input);
};

export { typePair, buildRows };

export type { RowKind, Row, RowActions, RowInput };
