import { TYPE_LABELS } from "./deps.js";
import type { ProjectHit, ProjectType, RouteHit } from "./deps.js";
import type { Row, RowActions, RowInput } from "./palette-row-types.js";
import type { Command } from "./registry.js";

const typePair = (type: ProjectType): string => TYPE_LABELS[type];

const projectMeta = (hit: ProjectHit): string | null => {
  if (hit.health?.level === "warn") {
    return hit.health.note;
  }

  return hit.place ?? null;
};

const withMeta = (row: Row, meta: string | null): Row => {
  if (meta) {
    return { ...row, meta };
  }

  return row;
};

const withKeys = (row: Row, keys: string | null): Row => {
  if (keys) {
    return { ...row, keys };
  }

  return row;
};

const withNote = (row: Row, note: string | null): Row => {
  if (note) {
    return { ...row, note };
  }

  return row;
};

const withDisabledReason = (
  row: Row,
  disabled: string | null | undefined
): Row => {
  if (disabled) {
    return { ...row, disabled };
  }

  return row;
};

const projectRow = (
  projectHit: ProjectHit,
  rowGroup: string,
  actions: RowActions,
  { keys, marks: rowMarks }: { keys: string | null; marks: number[] }
): Row =>
  withKeys(
    withMeta(
      {
        group: rowGroup,
        hit: projectHit,
        key: `p:${projectHit.id}`,
        kind: "project",
        marks: rowMarks,
        run: () => actions.openProject(projectHit.id),
        title: projectHit.name,
      },
      projectMeta(projectHit)
    ),
    keys
  );

const commandRow = (
  command: Command,
  rowGroup: string,
  rowMarks: number[],
  note: string | null
): Row =>
  withNote(
    withDisabledReason(
      {
        commandId: command.id,
        group: rowGroup,
        icon: command.icon ?? "dot",
        key: `c:${command.id}`,
        kind: "command",
        marks: rowMarks,
        run: command.run,
        title: command.title,
      },
      command.disabled
    ),
    note
  );

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

const routeRow = (
  routeHit: RouteHit,
  input: RowInput,
  routeMarks: number[]
): Row => ({
  group: `Routes in ${routeHit.projectName}`,
  icon: "link",
  key: `r:${routeHit.projectId}:${routeHit.route}`,
  kind: "route",
  marks: routeMarks,
  meta: routeHit.file,
  run: () => input.actions.openProject(routeHit.projectId, routeHit.route),
  title: routeHit.route,
});

export { commandRow, newRow, projectRow, routeRow, typePair, withKeys };
