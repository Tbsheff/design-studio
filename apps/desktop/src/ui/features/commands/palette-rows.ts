import { rank } from "./fuzzy.js";
import type { Ranked } from "./fuzzy.js";
import {
  commandRow,
  projectRow,
  routeRow,
  newRow,
  typePair,
  withKeys,
} from "./palette-row-builders.js";
import type { Row, RowInput, Scored } from "./palette-row-types.js";
import type { Command } from "./registry.js";

const WORD_MIN = 3;
const ROUTE_MAX = 3;
const DISABLED_PENALTY = 4;

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
  "version.export",
  "tool.comment",
  "panel.versions",
  "tool.select",
];

const MAX_PROJECTS = 6;
const MAX_ACTIONS = 12;
const STRONG = 10;

const markRuns = (marks: number[]): number =>
  marks.filter((at, index) => index === 0 || at !== (marks[index - 1] ?? 0) + 1)
    .length;

const clean = <Entry>(
  list: Ranked<Entry>[],
  query: string
): Ranked<Entry>[] => {
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

const toUseRank = (recent: readonly string[], id: string): number => {
  const at = recent.indexOf(id);

  if (at === -1) {
    return recent.length;
  }

  return at;
};

const contextCommands = (input: RowInput): Command[] => {
  if (!input.current) {
    return [];
  }

  const byId = new Map(input.commands.map((char) => [char.id, char]));

  return CONTEXT_IDS.flatMap((id) => byId.get(id) ?? [])
    .filter((ch) => !ch.disabled)
    .toSorted(
      (first, second) =>
        toUseRank(input.recent, first.id) - toUseRank(input.recent, second.id)
    );
};

const toShortcut = (isDesktop: boolean, keys: string): string | null => {
  if (isDesktop) {
    return keys;
  }

  return null;
};

const suggested = (input: RowInput, context: Command[]): Row[] => {
  const byId = new Map(input.commands.map((chNext) => [chNext.id, chNext]));
  const make = byId.get("project.new");
  const open = byId.get("project.open-folder");

  const rows: Row[] = context.map((charNext) =>
    commandRow(charNext, "Suggested", [], null)
  );

  if (make) {
    rows.push(
      withKeys(
        {
          ...commandRow(make, "Suggested", [], null),
          icon: "sparkle",
          meta: "Describe it next",
          title: "New prototype",
          tone: "brand",
        },
        toShortcut(input.desktop, "Mod+N")
      )
    );
  }

  if (open) {
    rows.push(
      withKeys(
        {
          ...commandRow(open, "Suggested", [], null),
          icon: "folder",
          meta: "Next.js, Vite or HTML",
          title: "Open app folder…",
          tone: "accent",
        },
        toShortcut(input.desktop, "Mod+O")
      )
    );
  }

  return rows;
};

const toRecentCount = (context: Command[]): number => {
  if (context.length > 0) {
    return RECENT_IN_STUDIO;
  }

  return RECENT_PROJECTS;
};

const toRecentKeys = (isMac: boolean, index: number): string | null => {
  if (isMac) {
    return `Ctrl+${index + 1}`;
  }

  return null;
};

const emptyRows = (input: RowInput): Row[] => {
  const others = input.projects.filter(
    (projectHit) => projectHit.id !== input.current
  );

  const context = contextCommands(input);

  const recentProjects = others
    .slice(0, toRecentCount(context))
    .map((hit, idx) =>
      projectRow(hit, "Recent", input.actions, {
        keys: toRecentKeys(input.mac, idx),
        marks: [],
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

  const top = input.recent.flatMap((id) => {
    const found = byId.get(id);

    if (found && !found.disabled) {
      return [found];
    }

    return [];
  });

  const topIds = new Set(top.map((charExtra) => charExtra.id));

  const rest = commands
    .filter((chOther) => !topIds.has(chOther.id))
    .toSorted(
      (first, second) => groupIndex(first.group) - groupIndex(second.group)
    );

  return [
    ...recentProjects,
    ...suggested(input, context),
    ...top.map((chExtra) => commandRow(chExtra, "Recent commands", [], null)),
    ...rest.map((commandValue) =>
      commandRow(commandValue, commandValue.group, [], null)
    ),
  ];
};

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
    rows: usable.flatMap((routeHitNext) => {
      if (named.has(routeHitNext.projectId)) {
        return [routeRow(routeHitNext, input, [])];
      }

      return [];
    }),
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
    const strong = clean(
      rank(input.projects, word, (itemNext) => ({
        keywords: itemNext.place ?? "",
        title: itemNext.name,
      })),
      word
    ).filter(
      (resultExtra) =>
        resultExtra.score >= STRONG - 1 && !seen.has(resultExtra.item.id)
    );

    for (const resultExtra of strong) {
      seen.add(resultExtra.item.id);
      out.push(
        projectRow(resultExtra.item, "Matches", input.actions, {
          keys: null,
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
        keys: null,
        marks: rectOther.marks,
      })
    );
  }

  return looseMatches(input);
};

const toActionScore = (
  result: Ranked<Command>,
  recent: Set<string>
): number => {
  let { score } = result;

  if (recent.has(result.item.id)) {
    score += 1;
  }

  if (result.item.disabled) {
    score -= DISABLED_PENALTY;
  }

  return score;
};

const actionMatches = (input: RowInput): Scored => {
  const recent = new Set(input.recent);

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
    .map((rectExtra): Ranked<Command> => ({
      item: rectExtra.item,
      marks: rectExtra.marks,
      score: toActionScore(rectExtra, recent),
    }))
    .toSorted((left, right) => right.score - left.score)
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
  let ordered = [...routes.rows, ...actions.rows];

  if (actionsFirst) {
    ordered = [...actions.rows, ...routes.rows];
  }

  const found = [...projectMatches(input), ...ordered];
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

export { buildRows };
