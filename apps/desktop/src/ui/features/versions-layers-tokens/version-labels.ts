import type { Version } from "../../../shared/contracts.js";
import {
  baseTitle,
  isRestoreKind,
  restoreTitle,
  runTitle,
} from "../../../shared/version-title.js";
import type { IconName } from "../../kit/Icon.js";

export type VersionIndex = ReadonlyMap<string, Version>;

interface KindInfo {
  label: string;
  icon: IconName;
  hint: string;
}

const MAX_CHAIN = 64;

const KIND_INFO: Record<
  Exclude<Version["meta"]["kind"], "manual">,
  KindInfo
> = {
  fork: { hint: "Start of a new direction", icon: "branch", label: "Branch" },
  init: { hint: "First version of this project", icon: "file", label: "Start" },
  keep: {
    hint: "Kept changes from a stopped run, or a chosen element variant",
    icon: "check",
    label: "Kept",
  },
  restore: {
    hint: "Brought back an earlier version",
    icon: "restore",
    label: "Restore",
  },
  run: {
    hint: "Made by the agent from a prompt",
    icon: "sparkle",
    label: "Run",
  },
  undo: { hint: "Undid the version below it", icon: "undo", label: "Undo" },
};

const EDIT_INFO: Record<
  "tokens" | "design-md" | "design-system" | "element",
  KindInfo
> = {
  "design-md": {
    hint: "You edited DESIGN.md",
    icon: "doc",
    label: "DESIGN.md",
  },
  "design-system": {
    hint: "You applied or switched the design system",
    icon: "palette",
    label: "Design system",
  },
  element: { hint: "You edited an element", icon: "pencil", label: "Edit" },
  tokens: { hint: "You changed design tokens", icon: "token", label: "Tokens" },
};

export function indexVersions(versions: Version[]): VersionIndex {
  return new Map(versions.map((v) => [v.id, v]));
}

function manualSort(raw: string): keyof typeof EDIT_INFO {
  const title = raw.replace(/^(Undo|Redo): /, "");

  if (/^(Update tokens|Add token)\b/.test(title)) {
    return "tokens";
  }

  if (title.startsWith("Update DESIGN.md")) {
    return "design-md";
  }

  if (/^(Apply|Switch to) .+ design system$/.test(title)) {
    return "design-system";
  }

  return "element";
}

export function kindInfo(v: Version): KindInfo {
  return v.meta.kind === "manual"
    ? EDIT_INFO[manualSort(v.title)]
    : KIND_INFO[v.meta.kind];
}

export function originOf(v: Version, index: VersionIndex): Version | null {
  let current: Version | undefined = v;

  for (
    let depth = 0;
    depth < MAX_CHAIN && current && isRestoreKind(current.meta.kind);
    depth += 1
  ) {
    const from: string | undefined = current.meta.restoredFrom;
    current = from ? index.get(from) : undefined;
  }

  return current && current !== v ? current : null;
}

function plainTitle(v: Version): string {
  if (v.name) {
    return v.name;
  }

  return v.meta.kind === "run" ? runTitle(v.title) : v.title;
}

export function displayTitle(v: Version, index: VersionIndex): string {
  return v.name ?? autoTitle(v, index);
}

export function autoTitle(v: Version, index: VersionIndex): string {
  const { kind } = v.meta;

  if (!isRestoreKind(kind)) {
    return v.meta.kind === "run" ? runTitle(v.title) : v.title;
  }

  const origin = originOf(v, index);

  return restoreTitle(
    kind,
    origin ? plainTitle(origin) : baseTitle(v.title, kind)
  );
}

export function undoneOf(v: Version, index: VersionIndex): Version | null {
  if (v.meta.kind !== "undo" || !v.parentId) {
    return null;
  }

  return index.get(v.parentId) ?? null;
}

const EDIT_LABEL = /^Edit (.+?): (.+?)( \([^)]*\))?$/;
const TEXT_LABEL = /^Edit text of (.+?)( \([^)]*\))?$/;
const MANY = /^\d+ elements$/;
const SIZE_PROPS = new Set(["width", "height"]);
const PLACE_PROPS = /^(left|right|top|bottom|margin(-.+)?|translate)$/;
const SPACE_PROPS = /^(padding(-.+)?|gap|row-gap|column-gap)$/;
const COLOR_PROPS = /^(color|background(-color)?|border-color|fill|stroke)$/;

function layerName(subject: string): string {
  return MANY.test(subject)
    ? subject
    : `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;
}

function editAction(props: string[]): string {
  if (props.every((prop) => SIZE_PROPS.has(prop))) {
    return "resize";
  }

  if (props.every((prop) => PLACE_PROPS.test(prop))) {
    return "move";
  }

  if (props.every((prop) => SPACE_PROPS.test(prop))) {
    return "spacing change";
  }

  if (props.every((prop) => COLOR_PROPS.test(prop))) {
    return "color change";
  }

  return "edit";
}

export function historyPhrase(label: string): string | null {
  const text = TEXT_LABEL.exec(label);

  if (text?.[1]) {
    return `text edit of ${layerName(text[1])}${text[2] ?? ""}`;
  }

  const edit = EDIT_LABEL.exec(label);

  if (!edit?.[1] || !edit[2]) {
    return null;
  }

  const props = edit[2].split(", ").map((prop) => prop.trim());

  return `${editAction(props)} of ${layerName(edit[1])}${edit[3] ?? ""}`;
}

export function fullText(v: Version): string | null {
  const prompt = v.meta.prompt?.trim();

  return prompt ? prompt : null;
}
