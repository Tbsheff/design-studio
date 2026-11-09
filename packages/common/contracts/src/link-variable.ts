import type { PrototypeLink } from "@design-studio/contracts/links";

const LINK_VARIABLE_OPS = ["set", "toggle", "add"] as const;
const LINK_VARIABLE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9]{0,31}$/u;
const LINK_VARIABLE_TEXT_MAX = 200;

type LinkVariableOp = (typeof LINK_VARIABLE_OPS)[number];

type LinkVariableValue = string | number;

interface LinkVariableSet {
  readonly name: string;
  readonly op: LinkVariableOp;
  readonly value: LinkVariableValue | null;
}

interface LinkWhen {
  readonly equals: LinkVariableValue;
  readonly name: string;
}

type VariableMemory = ReadonlyMap<string, LinkVariableValue>;

const cleanVariableName = (raw: string): string | null => {
  const name = raw.trim();

  if (!LINK_VARIABLE_NAME_RE.test(name)) {
    return null;
  }

  return name;
};

const cleanVariableValue = (
  raw: LinkVariableValue
): LinkVariableValue | null => {
  if (Number.isNaN(raw) || String(raw).length > LINK_VARIABLE_TEXT_MAX) {
    return null;
  }

  return raw;
};

const toVariableSet = (
  name: string,
  op: LinkVariableOp,
  value: LinkVariableValue | null
): LinkVariableSet => ({ name, op, value });

const cleanVariableSet = (
  rawName: string,
  rawOp: string,
  rawValue: LinkVariableValue | null
): LinkVariableSet | null => {
  const name = cleanVariableName(rawName);

  if (name === null) {
    return null;
  }

  if (rawOp === "toggle") {
    return toVariableSet(name, "toggle", null);
  }

  const value = cleanVariableValue(rawValue ?? Number.NaN);

  if (value === null) {
    return null;
  }

  if (rawOp === "add" && Number.isFinite(Number(value))) {
    return toVariableSet(name, "add", Number(value));
  }

  if (rawOp === "set") {
    return toVariableSet(name, "set", value);
  }

  return null;
};

const cleanWhen = (
  rawName: string,
  rawEquals: LinkVariableValue
): LinkWhen | null => {
  const name = cleanVariableName(rawName);
  const equals = cleanVariableValue(rawEquals);

  if (name === null || equals === null) {
    return null;
  }

  return { equals, name };
};

const interactionTail = (link: Pick<PrototypeLink, "to" | "when">): string => {
  let tail = "";

  if (link.when) {
    tail += `\u0000when\u0000${link.when.name}\u0000${String(link.when.equals)}`;
  }

  if ("variable" in link.to) {
    tail += `\u0000set\u0000${link.to.variable.name}`;
  }

  return tail;
};

const holdsWhen = (when: LinkWhen | null, memory: VariableMemory): boolean => {
  if (!when) {
    return true;
  }

  const held = memory.get(when.name) ?? null;

  return held !== null && String(held) === String(when.equals);
};

const toggled = (held: LinkVariableValue | null): string => {
  if (String(held) === "true") {
    return "false";
  }

  return "true";
};

const numberOf = (held: LinkVariableValue | null): number => {
  const base = Number(held ?? 0);

  if (Number.isFinite(base)) {
    return base;
  }

  return 0;
};

const toNextValue = (
  held: LinkVariableValue | null,
  change: LinkVariableSet
): LinkVariableValue => {
  if (change.op === "toggle") {
    return toggled(held);
  }

  if (change.op === "add") {
    return numberOf(held) + Number(change.value);
  }

  return change.value ?? "";
};

const applyVariable = (
  memory: VariableMemory,
  change: LinkVariableSet
): VariableMemory =>
  new Map([
    ...memory,
    [change.name, toNextValue(memory.get(change.name) ?? null, change)],
  ]);

export {
  LINK_VARIABLE_NAME_RE,
  LINK_VARIABLE_OPS,
  LINK_VARIABLE_TEXT_MAX,
  applyVariable,
  cleanVariableName,
  cleanVariableSet,
  cleanWhen,
  holdsWhen,
  interactionTail,
};

export type {
  LinkVariableOp,
  LinkVariableSet,
  LinkVariableValue,
  LinkWhen,
  VariableMemory,
};
