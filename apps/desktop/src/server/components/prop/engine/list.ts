import { toEnd, toStart } from "./ast.js";
import type { ComponentModel, Member, PropEntry } from "./types.js";

type PropKind = "boolean" | "instance" | "slot" | "text" | "value";

interface PropRow {
  readonly default: string | null;
  readonly isDeclared: boolean;
  readonly isRequired: boolean;
  readonly kind: PropKind;
  readonly name: string;
  readonly type: string | null;
}

const NODE_TYPE = /(?:^|[\s.|<])(?:ReactNode|ReactElement|JSX\.Element)\b/u;

const COMPONENT_TYPE =
  /^typeof\s|(?:^|[\s.|<])(?:ComponentType|ElementType|FC|FunctionComponent|LucideIcon|ComponentClass)\b/u;

const toTypeKind = (type: string): PropKind | null => {
  const bare = type
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part !== "undefined" && part !== "null")
    .join(" | ");

  if (bare === "boolean") {
    return "boolean";
  }

  if (bare === "string") {
    return "text";
  }

  if (COMPONENT_TYPE.test(bare)) {
    return "instance";
  }

  if (NODE_TYPE.test(bare)) {
    return "slot";
  }

  return null;
};

const toDefaultKind = (text: string | null): PropKind => {
  if (text === null) {
    return "value";
  }

  if (text === "true" || text === "false") {
    return "boolean";
  }

  if (/^["'`]/u.test(text)) {
    return "text";
  }

  if (text.startsWith("<")) {
    return "slot";
  }

  return "value";
};

const toKind = (
  name: string,
  type: string | null,
  defaultText: string | null
): PropKind => {
  if (name === "children") {
    return "slot";
  }

  if (type === null) {
    return toDefaultKind(defaultText);
  }

  return toTypeKind(type) ?? "value";
};

const toDefaultText = (
  model: ComponentModel,
  entry: PropEntry | null
): string | null => {
  if (!entry?.defaultNode) {
    return null;
  }

  return model.code.slice(toStart(entry.defaultNode), toEnd(entry.defaultNode));
};

const toRow = (
  model: ComponentModel,
  name: string,
  entry: PropEntry | null,
  member: Member | null
): PropRow => {
  const defaultText = toDefaultText(model, entry);
  const type = member?.typeText ?? null;

  const isDeclared = member !== null;

  const isRequired =
    member !== null && !member.isOptional && defaultText === null;

  const kind = toKind(name, type, defaultText);

  return { default: defaultText, isDeclared, isRequired, kind, name, type };
};

const listProps = (model: ComponentModel): PropRow[] => {
  const names = [
    ...new Set([
      ...model.entries.map((entry) => entry.name),
      ...model.host.members.map((member) => member.name),
    ]),
  ];

  return names.map((name) =>
    toRow(
      model,
      name,
      model.entries.find((entry) => entry.name === name) ?? null,
      model.host.members.find((member) => member.name === name) ?? null
    )
  );
};

export { listProps, toKind };

export type { PropKind, PropRow };
