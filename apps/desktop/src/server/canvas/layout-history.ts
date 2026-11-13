import type { CanvasWriteSource, Project } from "@design-studio/contracts";
import type {
  CanvasFile,
  CanvasFileFrame,
  CanvasSection,
  LayoutChange,
} from "@design-studio/contracts/canvas-file";
import type { LinksFile } from "@design-studio/contracts/links";

export type LayoutListener = (
  project: Project,
  change: LayoutChange,
  source: CanvasWriteSource
) => void;

export type LayoutStep = "undo" | "redo";

const RECORDED_SOURCES = new Set<CanvasWriteSource>(["user", "agent"]);

export function recordsLayout(source: CanvasWriteSource): boolean {
  return RECORDED_SOURCES.has(source);
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface ItemDiff<T> {
  added: T[];
  removed: T[];
  changed: { from: T; to: T }[];
}

function diffItems<T extends { id: string }>(from: T[], to: T[]): ItemDiff<T> {
  const toById = new Map(to.map((item) => [item.id, item]));
  const fromIds = new Set(from.map((item) => item.id));
  const changed: { from: T; to: T }[] = [];

  for (const item of from) {
    const next = toById.get(item.id);

    if (next && !same(item, next)) {
      changed.push({ from: item, to: next });
    }
  }

  return {
    added: to.filter((item) => !fromIds.has(item.id)),
    removed: from.filter((item) => !toById.has(item.id)),
    changed,
  };
}

function touchedIds<T extends { id: string }>(diff: ItemDiff<T>): string[] {
  return [
    ...diff.added,
    ...diff.removed,
    ...diff.changed.map((pair) => pair.from),
  ].map((item) => item.id);
}

function revertItems<T extends { id: string }>(
  current: T[],
  made: T[],
  back: T[]
): T[] | null {
  const ids = touchedIds(diffItems(back, made));
  const madeById = new Map(made.map((item) => [item.id, item]));
  const backById = new Map(back.map((item) => [item.id, item]));
  const currentById = new Map(current.map((item) => [item.id, item]));

  if (ids.some((id) => !same(currentById.get(id), madeById.get(id)))) {
    return null;
  }

  const touched = new Set(ids);

  const next = current.flatMap((item) => {
    if (!touched.has(item.id)) {
      return [item];
    }

    const restored = backById.get(item.id);

    return restored ? [restored] : [];
  });

  for (const id of ids) {
    const restored = backById.get(id);

    if (!restored || currentById.has(id)) {
      continue;
    }

    next.splice(Math.min(back.indexOf(restored), next.length), 0, restored);
  }

  return next;
}

function revertSet(
  current: string[],
  made: string[],
  back: string[]
): string[] | null {
  const added = made.filter((item) => !back.includes(item));
  const removed = back.filter((item) => !made.includes(item));

  if (
    added.some((item) => !current.includes(item)) ||
    removed.some((item) => current.includes(item))
  ) {
    return null;
  }

  return [...current.filter((item) => !added.includes(item)), ...removed];
}

export function revertCanvas(
  current: CanvasFile,
  made: CanvasFile,
  back: CanvasFile
): CanvasFile | null {
  const frames = revertItems(current.frames, made.frames, back.frames);
  const lofi = revertSet(current.lofi, made.lofi, back.lofi);

  const sections = revertItems(current.sections, made.sections, back.sections);

  if (frames === null || lofi === null || sections === null) {
    return null;
  }

  return { ...current, frames, lofi, sections };
}

const isSameStart = (left: LinksFile, right: LinksFile): boolean =>
  same(left.start, right.start) && same(left.starts, right.starts);

const toRestoredStart = (
  current: LinksFile,
  back: LinksFile,
  links: LinksFile["links"]
): LinksFile => {
  const restored: LinksFile = { links, version: current.version };

  if (back.start) {
    restored.start = back.start;
  }

  if (back.starts) {
    restored.starts = back.starts;
  }

  return restored;
};

export function revertLinks(
  current: LinksFile,
  made: LinksFile,
  back: LinksFile
): LinksFile | null {
  const links = revertItems(current.links, made.links, back.links);

  if (links === null) {
    return null;
  }

  if (isSameStart(made, back)) {
    return { ...current, links };
  }

  if (!isSameStart(current, made)) {
    return null;
  }

  return toRestoredStart(current, back, links);
}

const toStartNames = (file: LinksFile): string[] =>
  (file.starts ?? []).map((point) => point.name);

const toStartLabel = (before: LinksFile, after: LinksFile): string | null => {
  if (isSameStart(before, after)) {
    return null;
  }

  if (
    same(toStartNames(before), toStartNames(after)) &&
    !same(before.start, after.start)
  ) {
    return "Set start frame";
  }

  return "Change start points";
};

function frameName(frame: CanvasFileFrame): string {
  const name =
    frame.label ?? (frame.path === undefined ? undefined : `/${frame.path}`);

  return name ? ` ${name}` : "";
}

function changedFramesLabel(
  changed: { from: CanvasFileFrame; to: CanvasFileFrame }[]
): string {
  const moved = changed.every(({ from, to }) =>
    same({ ...from, order: 0, x: 0, y: 0 }, { ...to, order: 0, x: 0, y: 0 })
  );

  const resized = changed.every(({ from, to }) =>
    same({ ...from, height: 0, width: 0 }, { ...to, height: 0, width: 0 })
  );

  const verb = moved ? "Move" : resized ? "Resize" : "Change";
  const first = changed[0];

  return changed.length === 1 && first
    ? `${verb} frame${frameName(first.to)}`
    : `${verb} ${changed.length} frames`;
}

function withImplicitFirst(
  before: CanvasFileFrame[],
  after: CanvasFileFrame[]
): CanvasFileFrame[] {
  if (before.length > 0 || after.length < 2) {
    return before;
  }

  const first = after.find((frame) => frame.id === "f1");

  return first ? [first] : before;
}

function toSectionName(section: CanvasSection): string {
  return section.label === "" ? "" : ` ${section.label}`;
}

function toChangedSectionLabel(from: CanvasSection, to: CanvasSection): string {
  const box = { height: 0, width: 0, x: 0, y: 0 };

  if (!same({ ...from, label: "" }, { ...to, label: "" })) {
    const geometryOnly = same({ ...from, ...box }, { ...to, ...box });

    if (!geometryOnly) {
      return "Change section";
    }

    const isSized = from.width === to.width && from.height === to.height;

    return `${isSized ? "Move" : "Resize"} section${toSectionName(to)}`;
  }

  return `Rename section${toSectionName(to)}`;
}

function toSectionsLabel(before: CanvasFile, after: CanvasFile): string | null {
  const diff = diffItems(before.sections, after.sections);
  const [added, removed] = [diff.added[0], diff.removed[0]];
  const counts = [diff.added.length, diff.removed.length, diff.changed.length];
  const kinds = counts.filter((count) => count > 0).length;
  const first = diff.changed[0];

  if (kinds === 0) {
    return null;
  }

  if (kinds > 1 || counts.some((count) => count > 1)) {
    return "Change sections";
  }

  if (added) {
    return `Add section${toSectionName(added)}`;
  }

  if (removed) {
    return `Remove section${toSectionName(removed)}`;
  }

  return first ? toChangedSectionLabel(first.from, first.to) : null;
}

function toFramesLabel(before: CanvasFile, after: CanvasFile): string | null {
  const diff = diffItems(
    withImplicitFirst(before.frames, after.frames),
    after.frames
  );

  const edited = diff.changed.filter(
    ({ from, to }) => !same({ ...from, order: 0 }, { ...to, order: 0 })
  );

  const kinds = [diff.added.length, diff.removed.length, edited.length].filter(
    (count) => count > 0
  ).length;

  if (kinds > 1) {
    return "Change canvas frames";
  }

  const [added, removed] = [diff.added[0], diff.removed[0]];

  if (added) {
    return diff.added.length === 1
      ? `Add frame${frameName(added)}`
      : `Add ${diff.added.length} frames`;
  }

  if (removed) {
    return diff.removed.length === 1
      ? `Remove frame${frameName(removed)}`
      : `Remove ${diff.removed.length} frames`;
  }

  if (diff.changed.length > 0) {
    return changedFramesLabel(diff.changed);
  }

  return same(before.lofi, after.lofi) ? null : "Change lo-fi frames";
}

function canvasLabel(before: CanvasFile, after: CanvasFile): string | null {
  const sectionLabel = toSectionsLabel(before, after);

  if (sectionLabel === null) {
    return toFramesLabel(before, after);
  }

  return sectionLabel.startsWith("Move section") ||
    toFramesLabel(before, after) === null
    ? sectionLabel
    : "Change canvas";
}

function linksLabel(before: LinksFile, after: LinksFile): string | null {
  const diff = diffItems(before.links, after.links);
  const counts = [diff.added.length, diff.removed.length, diff.changed.length];
  const total = counts.reduce((sum, count) => sum + count, 0);
  const startLabel = toStartLabel(before, after);
  const startChanged = startLabel !== null;

  if (total === 0) {
    return startLabel;
  }

  if (startChanged || counts.filter((count) => count > 0).length > 1) {
    return "Change prototype links";
  }

  const verb =
    diff.added.length > 0
      ? "Add"
      : diff.removed.length > 0
        ? "Remove"
        : "Change";

  return total === 1
    ? `${verb} prototype link`
    : `${verb} ${total} prototype links`;
}

export function layoutLabel(change: LayoutChange): string | null {
  return change.kind === "canvas"
    ? canvasLabel(change.before, change.after)
    : linksLabel(change.before, change.after);
}
