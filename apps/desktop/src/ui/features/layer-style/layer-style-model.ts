import { copy } from "./copy.js";
import { createLiveStore } from "./deps.js";
import type {
  RouteInput,
  RouteOutput,
  SelectionContext,
  layerStyleRoutes,
} from "./deps.js";

type PasteInput = RouteInput<typeof layerStyleRoutes.applyLayerStyle>;

type PasteResult = RouteOutput<typeof layerStyleRoutes.applyLayerStyle>;

type StyleGroup = NonNullable<PasteInput["groups"]>[number];

interface CopiedStyle {
  readonly directionId: string;
  readonly label: string;
  readonly layerId: string;
  readonly projectId: string;
}

interface GroupChoice {
  readonly group: StyleGroup;
  readonly label: string;
}

const GROUP_CHOICES: readonly GroupChoice[] = [
  { group: "fill", label: copy.groupFill },
  { group: "text", label: copy.groupText },
  { group: "spacing", label: copy.groupSpacing },
  { group: "border", label: copy.groupBorder },
  { group: "radius", label: copy.groupRadius },
  { group: "effect", label: copy.groupEffect },
  { group: "size", label: copy.groupSize },
  { group: "layout", label: copy.groupLayout },
];

const DEFAULT_GROUPS: readonly StyleGroup[] = [
  "fill",
  "text",
  "spacing",
  "border",
  "radius",
  "effect",
];

const copiedStyleStore = createLiveStore<CopiedStyle | null>(null);

const toLayerId = (selection: SelectionContext): string | null => {
  const { source } = selection;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const toPasteSummary = (result: PasteResult): string => {
  const done = result.changed.length;
  const [first] = result.skipped;

  if (done === 0 && first) {
    return first.reason;
  }

  let text = `Style pasted on ${done} layer`;

  if (done !== 1) {
    text = `${text}s`;
  }

  if (result.skipped.length > 0) {
    return `${text}. ${result.skipped.length} skipped: ${first?.reason ?? ""}`;
  }

  return text;
};

const toPasteBody = (
  body: PasteInput,
  groups: readonly StyleGroup[] | null
): PasteInput => {
  if (groups === null) {
    return body;
  }

  return { ...body, groups: [...groups] };
};

const toToggled = (
  current: readonly StyleGroup[],
  group: StyleGroup,
  isChecked: boolean
): StyleGroup[] => {
  const rest = current.filter((entry) => entry !== group);

  if (isChecked) {
    return [...rest, group];
  }

  return rest;
};

const toPasteBlocker = (
  copied: CopiedStyle | null,
  scope: { readonly directionId: string; readonly projectId: string }
): string | null => {
  if (copied === null) {
    return copy.needCopy;
  }

  if (
    copied.projectId !== scope.projectId ||
    copied.directionId !== scope.directionId
  ) {
    return copy.otherProject;
  }

  return null;
};

export {
  DEFAULT_GROUPS,
  GROUP_CHOICES,
  copiedStyleStore,
  toLayerId,
  toPasteBlocker,
  toPasteBody,
  toPasteSummary,
  toToggled,
};

export type { CopiedStyle, GroupChoice, PasteInput, PasteResult, StyleGroup };
