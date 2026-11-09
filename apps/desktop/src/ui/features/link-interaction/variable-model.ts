import { VARIABLE_OP_LABELS } from "./copy.js";
import { LINK_VARIABLE_OPS, cleanVariableName } from "./deps.js";
import type {
  LinkInteractionChange,
  LinkVariableOp,
  LinkVariableValue,
  PrototypeLink,
  UiSelectOption,
} from "./deps.js";

type ChangeBody = Omit<LinkInteractionChange, "linkId">;

interface VariableDraft {
  readonly name: string;
  readonly op: LinkVariableOp;
  readonly value: string;
}

interface WhenDraft {
  readonly name: string;
  readonly value: string;
}

const DEFAULT_VALUE = "true";

const variableOptions: UiSelectOption<LinkVariableOp>[] = LINK_VARIABLE_OPS.map(
  (op) => ({ label: VARIABLE_OP_LABELS[op], value: op })
);

const textOf = (value: LinkVariableValue | null): string => {
  if (value === null) {
    return "";
  }

  return String(value);
};

const toVariableValue = (text: string): LinkVariableValue => {
  const trimmed = text.trim();
  const number = Number(trimmed);

  if (trimmed !== "" && Number.isFinite(number) && String(number) === trimmed) {
    return number;
  }

  return text;
};

const draftOf = (link: PrototypeLink): VariableDraft => {
  if ("variable" in link.to) {
    const { name, op, value } = link.to.variable;

    return { name, op, value: textOf(value) };
  }

  return { name: "", op: "set", value: DEFAULT_VALUE };
};

const whenDraftOf = (link: PrototypeLink): WhenDraft => {
  if (link.when) {
    return { name: link.when.name, value: String(link.when.equals) };
  }

  return { name: "", value: "" };
};

const isVariableValue = (op: LinkVariableOp, text: string): boolean => {
  if (op === "toggle") {
    return true;
  }

  if (op === "add") {
    return text.trim() !== "" && Number.isFinite(Number(text));
  }

  return text.trim() !== "";
};

const isVariableName = (text: string): boolean =>
  cleanVariableName(text) !== null;

const variableChange = (draft: VariableDraft): ChangeBody | null => {
  const name = cleanVariableName(draft.name);

  if (name === null || !isVariableValue(draft.op, draft.value)) {
    return null;
  }

  if (draft.op === "toggle") {
    return {
      action: "set-variable",
      variableName: name,
      variableOp: "toggle",
      variableValue: null,
    };
  }

  return {
    action: "set-variable",
    variableName: name,
    variableOp: draft.op,
    variableValue: toVariableValue(draft.value),
  };
};

const whenChange = (draft: WhenDraft): ChangeBody | null => {
  if (draft.name.trim() === "") {
    return { whenName: null };
  }

  const name = cleanVariableName(draft.name);

  if (name === null) {
    return null;
  }

  if (draft.value === "") {
    return { whenEquals: DEFAULT_VALUE, whenName: name };
  }

  return { whenEquals: toVariableValue(draft.value), whenName: name };
};

const variableNamesOf = (
  links: readonly PrototypeLink[]
): readonly string[] => {
  const names = new Set<string>();

  for (const link of links) {
    if ("variable" in link.to) {
      names.add(link.to.variable.name);
    }

    if (link.when) {
      names.add(link.when.name);
    }
  }

  return [...names].toSorted();
};

export {
  draftOf,
  isVariableName,
  isVariableValue,
  variableChange,
  variableNamesOf,
  variableOptions,
  whenChange,
  whenDraftOf,
};

export type { ChangeBody, VariableDraft, WhenDraft };
