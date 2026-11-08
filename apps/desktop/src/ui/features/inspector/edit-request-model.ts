import type {
  DirectEditRequest,
  DirectStyleProperty,
  SelectionContext,
  TextSourceHints,
} from "@design-studio/contracts";

import type { StyleValues } from "./css-value-model.js";
import type { DirectEdit, DirectEditCommit } from "./deps.js";

type EditValues = Pick<DirectEdit, "values" | "mixed" | "preview" | "commit">;

const NO_MIXED: ReadonlySet<DirectStyleProperty> = new Set();

const toDeclared = (
  styles: Record<string, string>,
  style: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(style).flatMap(([key, value]) => {
      if (`declared-${key}` in styles) {
        return [[`declared-${key}`, value]];
      }

      return [];
    })
  );

const applyCommitTo = (
  entry: SelectionContext,
  commit: DirectEditCommit
): SelectionContext => {
  if (entry.selector !== commit.selector) {
    return entry;
  }

  return {
    ...entry,
    styles: {
      ...entry.styles,
      ...toDeclared(entry.styles, commit.style),
      ...commit.style,
    },
    text: commit.text ?? entry.text,
  };
};

const applyCommit = (
  prev: SelectionContext[],
  commit: DirectEditCommit
): SelectionContext[] => prev.map((entry) => applyCommitTo(entry, commit));

const isSameEditValues = (
  first: EditValues,
  second: EditValues,
  props: readonly DirectStyleProperty[]
): boolean => {
  if (first === second) {
    return true;
  }

  if (first.preview !== second.preview || first.commit !== second.commit) {
    return false;
  }

  return props.every(
    (prop) =>
      first.values[prop] === second.values[prop] &&
      first.mixed.has(prop) === second.mixed.has(prop)
  );
};

const toTextHints = (selection: SelectionContext): TextSourceHints => {
  const hints: TextSourceHints = { text: selection.text };

  if (selection.usedAt) {
    hints.usedAt = selection.usedAt;
  }

  if (selection.owners?.length) {
    hints.owners = selection.owners;
  }

  return hints;
};

const toWireStyle = (
  style: Partial<StyleValues>
): Record<string, string | null> =>
  Object.fromEntries(
    Object.entries(style).map(([prop, value]) => {
      const trimmed = value.trim();

      if (trimmed === "") {
        return [prop, null];
      }

      return [prop, trimmed];
    })
  );

const toEditTarget = (
  selection: SelectionContext
): { readonly component: string } | { readonly tag: string } => {
  if (selection.component) {
    return { component: selection.component };
  }

  return { tag: selection.tag.toLowerCase() };
};

const createEditRequest = (
  selection: SelectionContext,
  style: Partial<StyleValues>,
  text: string | null,
  editVariant: string
): DirectEditRequest | null => {
  const { source } = selection;
  const hasStyle = Object.keys(style).length > 0;

  if (!source || (!hasStyle && text === null)) {
    return null;
  }

  const request: DirectEditRequest = {
    selector: selection.selector,
    source,
    ...toEditTarget(selection),
  };

  if (hasStyle) {
    request.style = toWireStyle(style);
  }

  if (text !== null) {
    request.hints = toTextHints(selection);
    request.text = text;
  }

  if (hasStyle && editVariant) {
    request.variant = editVariant;
  }

  return request;
};

export {
  NO_MIXED,
  applyCommit,
  createEditRequest,
  isSameEditValues,
  toTextHints,
};
