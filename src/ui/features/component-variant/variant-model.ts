import { VARIANT_VALUE } from "./deps.js";
import type {
  ComponentSchema,
  ComponentVariantChange,
  ComponentVariantTarget,
  CvaInfo,
  VariantGroup,
  VariantOption,
} from "./deps.js";

type SheetMode = "create" | "edit";

interface VariantDraft {
  readonly classes: string;
  readonly from: string;
  readonly name: string;
  readonly setDefault: boolean;
  readonly shouldUseOnSelected: boolean;
}

interface VariantSaved {
  readonly key: string;
  readonly title: string;
  readonly shouldUseOnSelected: boolean;
  readonly value: string;
}

interface VariantSheetProps {
  readonly component: ComponentSchema;
  readonly current: string;
  readonly directionId: string;
  readonly group: VariantGroup;
  readonly mode: SheetMode;
  readonly onClose: () => void;
  readonly onSaved: (saved: VariantSaved) => void;
  readonly projectId: string;
}

type NameState = "ok" | "taken" | "wrong";

const SUGGEST_MAX = 8;

const optionOf = (group: VariantGroup, value: string): VariantOption | null =>
  group.options.find((entry) => entry.value === value) ?? null;

const startOf = (group: VariantGroup, current: string): string => {
  if (optionOf(group, current)) {
    return current;
  }

  return group.default ?? group.options[0]?.value ?? "";
};

const classesOf = (option: VariantOption | null): string => {
  if (!option || !option.editable) {
    return "";
  }

  return option.classes;
};

const initialDraft = (
  group: VariantGroup,
  mode: SheetMode,
  current: string
): VariantDraft => {
  const start = startOf(group, current);
  const option = optionOf(group, start);
  let label = "";

  if (mode === "edit") {
    label = start;
  }

  return {
    classes: classesOf(option),
    from: start,
    name: label,
    setDefault: false,
    shouldUseOnSelected: mode === "create",
  };
};

const nameStateOf = (
  group: VariantGroup,
  mode: SheetMode,
  draft: VariantDraft
): NameState => {
  const name = draft.name.trim();

  if (!VARIANT_VALUE.test(name)) {
    return "wrong";
  }

  if (mode === "edit" && name === draft.from) {
    return "ok";
  }

  if (optionOf(group, name)) {
    return "taken";
  }

  return "ok";
};

const textOrNull = (text: string): string | null => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

const createChangeOf = (
  group: VariantGroup,
  draft: VariantDraft
): ComponentVariantChange | null => {
  const option = optionOf(group, draft.from);
  const classes = textOrNull(draft.classes);
  let copyFrom: string | null = null;

  if (option && !option.editable) {
    copyFrom = option.value;
  }

  if (classes === null && copyFrom === null) {
    return null;
  }

  return {
    classes,
    copyFrom,
    key: group.prop,
    kind: "create",
    newKey: false,
    setDefault: draft.setDefault,
    value: draft.name.trim(),
  };
};

const editChangeOf = (
  group: VariantGroup,
  draft: VariantDraft
): ComponentVariantChange | null => {
  const option = optionOf(group, draft.from);

  if (!option || !option.editable) {
    return null;
  }

  const name = draft.name.trim();
  const next = textOrNull(draft.classes);
  let newName: string | null = null;
  let newClasses: string | null = null;

  if (name !== option.value) {
    newName = name;
  }

  if (next !== null && next !== option.classes.trim()) {
    newClasses = next;
  }

  if (newName === null && newClasses === null && !draft.setDefault) {
    return null;
  }

  return {
    classes: newClasses,
    key: group.prop,
    kind: "update",
    rename: newName,
    setDefault: draft.setDefault,
    value: option.value,
  };
};

const changeOf = (
  group: VariantGroup,
  mode: SheetMode,
  draft: VariantDraft
): ComponentVariantChange | null => {
  if (nameStateOf(group, mode, draft) !== "ok") {
    return null;
  }

  if (mode === "create") {
    return createChangeOf(group, draft);
  }

  return editChangeOf(group, draft);
};

const targetOf = (
  component: ComponentSchema,
  cva: CvaInfo
): ComponentVariantTarget => ({
  cva: cva.name,
  file: component.file,
  name: component.name,
});

const tokensOf = (text: string): string[] => text.split(/\s+/u).filter(Boolean);

const knownClassesOf = (cva: CvaInfo): string[] => {
  const all = [
    cva.base,
    ...cva.variants.flatMap((group) =>
      group.options.map((entry) => entry.classes)
    ),
  ];

  return [...new Set(all.flatMap((text) => tokensOf(text)))].toSorted();
};

const lastTokenOf = (text: string): string => {
  if (/\s$/u.test(text)) {
    return "";
  }

  return tokensOf(text).at(-1) ?? "";
};

const suggestionsOf = (known: readonly string[], text: string): string[] => {
  const last = lastTokenOf(text);

  if (last === "") {
    return [];
  }

  const used = new Set(tokensOf(text));

  return known
    .filter((entry) => entry.startsWith(last) && !used.has(entry))
    .slice(0, SUGGEST_MAX);
};

const withSuggestion = (text: string, pick: string): string => {
  const tokens = tokensOf(text);

  if (lastTokenOf(text) !== "") {
    tokens.pop();
  }

  return `${[...tokens, pick].join(" ")} `;
};

export {
  changeOf,
  initialDraft,
  knownClassesOf,
  nameStateOf,
  optionOf,
  suggestionsOf,
  targetOf,
  withSuggestion,
};

export type {
  NameState,
  SheetMode,
  VariantDraft,
  VariantSaved,
  VariantSheetProps,
};
