import type {
  ClassChange,
  DirectEditBatch,
  DirectEditRequest,
  StructureEditRequest,
} from "@design-studio/contracts";

import { normalizeVariant } from "../../../shared/variants.js";
import {
  MAX_BATCH,
  decodeEditBatch,
  decodeEditRequest,
  decodeStructureEdit,
} from "../request/edit-request-schema.js";
import type {
  DecodedEditRequest,
  DecodedStructureEdit,
} from "../request/edit-request-schema.js";
import { toIssueText } from "../request/request-fields.js";
import { DirectEditError } from "./errors.js";

interface ClassCounts {
  readonly add?: readonly string[] | undefined;
  readonly remove?: readonly string[] | undefined;
}

const hasClasses = (classes: ClassCounts | undefined): boolean =>
  (classes?.add?.length ?? 0) + (classes?.remove?.length ?? 0) > 0;

const hasAny = (values: readonly unknown[]): boolean =>
  values.some((value) => value !== undefined);

const toRequestConflicts = (draft: DecodedEditRequest): string[] => {
  const { classes, component, insert, move, name, style, text, variant } =
    draft;

  const conflicts: string[] = [];

  if (component !== undefined && hasAny([name, move, insert])) {
    conflicts.push("a component use takes style, classes and text only");
  }

  if (
    !hasAny([text, name, move, insert]) &&
    !hasClasses(classes) &&
    Object.keys(style ?? {}).length === 0
  ) {
    conflicts.push("style, text, classes, name, move or insert is required");
  }

  if (insert !== undefined && hasAny([move, text, name, style, classes])) {
    conflicts.push("insert must be the only change");
  }

  if (move !== undefined && hasAny([text, name, style, classes])) {
    conflicts.push("move must be the only change");
  }

  if (normalizeVariant(variant) && hasAny([name, move, insert])) {
    conflicts.push(
      "variant works with style, classes and text only (text has no variant)"
    );
  }

  return conflicts;
};

const toClassChange = (
  classes: NonNullable<DecodedEditRequest["classes"]>
): ClassChange => {
  const change: ClassChange = {};

  if (classes.add !== undefined) {
    change.add = [...classes.add];
  }

  if (classes.remove !== undefined) {
    change.remove = [...classes.remove];
  }

  return change;
};

const toEditRequest = (draft: DecodedEditRequest): DirectEditRequest => {
  const request: DirectEditRequest = {
    selector: draft.selector,
    source: { ...draft.source },
  };

  const classes = draft.classes && toClassChange(draft.classes);
  const variant = normalizeVariant(draft.variant);

  if (draft.tag !== undefined) request.tag = draft.tag;
  if (draft.style !== undefined) request.style = { ...draft.style };
  if (draft.text !== undefined) request.text = draft.text;
  if (draft.name !== undefined) request.name = draft.name;
  if (draft.move !== undefined) request.move = draft.move;
  if (draft.insert !== undefined) request.insert = draft.insert;
  if (hasClasses(classes)) request.classes = classes;
  if (draft.component !== undefined) request.component = draft.component;
  if (variant) request.variant = variant;
  if (draft.hints && request.text !== undefined) {
    request.hints = {
      text: draft.hints.text,
      ...(draft.hints.usedAt !== undefined && { usedAt: draft.hints.usedAt }),
      ...(draft.hints.owners !== undefined && {
        owners: [...draft.hints.owners],
      }),
    };
  }

  return request;
};

export function parseDirectEditRequest(raw: unknown): DirectEditRequest {
  const parsed = decodeEditRequest(raw);

  if (parsed._tag === "Failure") {
    throw new DirectEditError(
      "invalid_request",
      `Invalid direct edit: ${toIssueText(parsed, "(root)")}`
    );
  }

  const conflicts = toRequestConflicts(parsed.success);

  if (conflicts.length > 0) {
    throw new DirectEditError(
      "invalid_request",
      `Invalid direct edit: (root): ${conflicts.join("; (root): ")}`
    );
  }

  return toEditRequest(parsed.success);
}

export function isDirectEditBatch(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && "edits" in raw;
}

const toBatchEntry = (entry: unknown, index: number): DirectEditRequest => {
  const label = `Edit ${index + 1}`;
  let request: DirectEditRequest;

  try {
    request = parseDirectEditRequest(entry);
  } catch (error) {
    if (error instanceof DirectEditError) {
      throw new DirectEditError(
        "invalid_request",
        `${label}: ${error.message}`
      );
    }

    throw error;
  }

  if (hasAny([request.name, request.move, request.insert])) {
    throw new DirectEditError(
      "invalid_request",
      `${label}: a batch can only change style, text and classes`
    );
  }

  return request;
};

export function parseDirectEditBatch(raw: unknown): DirectEditBatch {
  const parsed = decodeEditBatch(raw);

  if (parsed._tag === "Failure") {
    throw new DirectEditError(
      "invalid_request",
      `Invalid direct edit batch: send 1 to ${MAX_BATCH} edits`
    );
  }

  return {
    edits: parsed.success.edits.map((entry, index) =>
      toBatchEntry(entry, index)
    ),
  };
}

const isPlaceCountOk = (
  op: StructureEditRequest["op"],
  count: number
): boolean => {
  if (op === "move") {
    return count === 1;
  }

  if (op === "duplicate") {
    return count <= 1;
  }

  return count === 0;
};

const toStructureConflicts = (request: DecodedStructureEdit): string[] => {
  const conflicts: string[] = [];

  const places = [request.into, request.before, request.after].filter(
    Boolean
  ).length;

  if (!isPlaceCountOk(request.op, places)) {
    conflicts.push(
      "move needs exactly one of into, before or after; duplicate takes at most one; other ops take none"
    );
  }

  if (request.replace && (request.op !== "duplicate" || places > 0)) {
    conflicts.push(
      "replace works only with duplicate and without into, before or after"
    );
  }

  if (
    request.style !== undefined &&
    !(request.op === "duplicate" && request.targets.length === 1)
  ) {
    conflicts.push(
      "style works only with duplicate of one target (it styles the copy)"
    );
  }

  return conflicts;
};

export function isStructureEdit(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && "op" in raw;
}

export function parseStructureEdit(raw: unknown): StructureEditRequest {
  const parsed = decodeStructureEdit(raw);

  if (parsed._tag === "Failure") {
    throw new DirectEditError(
      "invalid_request",
      `Invalid structure edit: ${toIssueText(parsed, "(root)")}`
    );
  }

  const conflicts = toStructureConflicts(parsed.success);

  if (conflicts.length > 0) {
    throw new DirectEditError(
      "invalid_request",
      `Invalid structure edit: (root): ${conflicts.join("; (root): ")}`
    );
  }

  return parsed.success as StructureEditRequest;
}
