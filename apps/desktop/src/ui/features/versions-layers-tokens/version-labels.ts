import type { Version } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import {
  baseTitle,
  isRestoreKind,
  restoreTitle,
  runTitle,
} from "../../../shared/version-title.js";
import { COPY } from "./copy.js";

type VersionIndex = ReadonlyMap<string, Version>;

interface KindInfo {
  label: string;
  icon: IconName;
  hint: string;
}

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
  layout: {
    hint: "You moved, aligned or changed frames on the canvas",
    icon: "frame",
    label: "Layout",
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

const MAX_CHAIN = 64;

const indexVersions = (versions: Version[]): VersionIndex =>
  new Map(versions.map((version) => [version.id, version]));

const toManualSort = (raw: string): keyof typeof EDIT_INFO => {
  const title = raw.replace(/^(?:Undo|Redo): /u, "");

  if (/^(?:Update tokens|Add token)\b/u.test(title)) {
    return "tokens";
  }

  if (title.startsWith("Update DESIGN.md")) {
    return "design-md";
  }

  if (/^(?:Apply|Switch to) .+ design system$/u.test(title)) {
    return "design-system";
  }

  return "element";
};

const kindInfo = (version: Version): KindInfo => {
  const { kind } = version.meta;

  if (kind === "manual") {
    return EDIT_INFO[toManualSort(version.title)];
  }

  return KIND_INFO[kind];
};

const toRunTitle = (version: Version): string => {
  if (version.meta.kind === "run") {
    return runTitle(version.title);
  }

  return version.title;
};

const toRestoredParent = (
  version: Version,
  index: VersionIndex
): Version | null => {
  const restoredFrom: string | undefined = version.meta.restoredFrom;

  if (!restoredFrom) {
    return null;
  }

  return index.get(restoredFrom) ?? null;
};

const authorOf = (version: Version): string => {
  const { client, kind, origin } = version.meta;

  if (kind === "run" || origin === "agent") {
    return COPY.authorAgent;
  }

  if (origin === "mcp") {
    return client ?? COPY.authorMcp;
  }

  return COPY.authorPerson;
};

const originOf = (version: Version, index: VersionIndex): Version | null => {
  let current: Version | null = version;

  for (
    let depth = 0;
    depth < MAX_CHAIN && current && isRestoreKind(current.meta.kind);
    depth += 1
  ) {
    current = toRestoredParent(current, index);
  }

  if (current && current !== version) {
    return current;
  }

  return null;
};

const plainTitle = (version: Version): string => {
  if (version.name) {
    return version.name;
  }

  return toRunTitle(version);
};

const titleSourceOf = (
  version: Version,
  index: VersionIndex
): Version | null => {
  if (version.meta.kind !== "undo") {
    return originOf(version, index);
  }

  return index.get(version.parentId ?? "") ?? null;
};

const autoTitle = (version: Version, index: VersionIndex): string => {
  const { kind } = version.meta;

  if (!isRestoreKind(kind)) {
    return toRunTitle(version);
  }

  const origin = titleSourceOf(version, index);
  let base = baseTitle(version.title, kind);

  if (origin) {
    base = plainTitle(origin);
  }

  return restoreTitle(kind, base);
};

const displayTitle = (version: Version, index: VersionIndex): string =>
  version.name ?? autoTitle(version, index);

const undoneOf = (version: Version, index: VersionIndex): Version | null => {
  if (version.meta.kind !== "undo" || !version.parentId) {
    return null;
  }

  return index.get(version.parentId) ?? null;
};

const EDIT_LABEL =
  /^Edit (?<subject>.+?): (?<props>.+?)(?<suffix> \([^)]*\))?$/u;

const TEXT_LABEL = /^Edit text of (?<subject>.+?)(?<suffix> \([^)]*\))?$/u;
const MANY = /^\d+ elements$/u;
const SIZE_PROPS = new Set(["width", "height"]);
const PLACE_PROPS = /^(?:left|right|top|bottom|margin(?:-.+)?|translate)$/u;
const SPACE_PROPS = /^(?:padding(?:-.+)?|gap|row-gap|column-gap)$/u;

const COLOR_PROPS =
  /^(?:color|background(?:-color)?|border-color|fill|stroke)$/u;

const layerName = (subject: string): string => {
  if (MANY.test(subject)) {
    return subject;
  }

  return `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;
};

const editAction = (props: string[]): string => {
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
};

const historyPhrase = (label: string): string | null => {
  const text = TEXT_LABEL.exec(label)?.groups;

  if (text?.subject) {
    return `text edit of ${layerName(text.subject)}${text.suffix ?? ""}`;
  }

  const edit = EDIT_LABEL.exec(label)?.groups;

  if (!edit?.subject || !edit.props) {
    return null;
  }

  const props = edit.props.split(", ").map((prop) => prop.trim());

  return `${editAction(props)} of ${layerName(edit.subject)}${edit.suffix ?? ""}`;
};

const fullText = (version: Version): string | null => {
  const prompt = version.meta.prompt?.trim();

  if (prompt) {
    return prompt;
  }

  return null;
};

export {
  authorOf,
  autoTitle,
  displayTitle,
  fullText,
  historyPhrase,
  indexVersions,
  kindInfo,
  originOf,
  undoneOf,
};

export type { VersionIndex };
