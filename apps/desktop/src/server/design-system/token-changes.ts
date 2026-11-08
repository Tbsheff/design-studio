import type {
  TokenChange,
  TokenFile,
  TokenGroupName,
} from "@design-studio/contracts";
import { Schema } from "effect";

import { DirectEditError } from "../events/index.js";
import { cssVarFor } from "./compile.js";
import { VALUE_CHECKS } from "./create-token.js";
import { toIssueLines, toParser } from "./parse-schema.js";
import { toTrimmed } from "./schema-fields.js";

const MAX_CHANGES = 100;
const MAX_PATH = 120;
const MAX_VALUE = 200;
const WHOLE_ALIAS = /^\{[A-Za-z0-9_.-]+\}$/;
const PATH_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$/;
const UNSAFE = /[;{}<>\\\u0000-\u001F\u007F]/;
const MODES = "studio.modes";

type TokenNode = Record<string, unknown>;

const valueSchema = toTrimmed(1, MAX_VALUE);

const PathMessage = { message: "path must look like color.primary" };

const PathSchema = Schema.String.check(
  Schema.isMaxLength(MAX_PATH),
  Schema.isPattern(PATH_PATTERN, PathMessage)
);

const ChangeFieldsSchema = Schema.Struct({
  darkValue: Schema.optionalKey(Schema.NullOr(valueSchema)),
  path: PathSchema,
  value: Schema.optionalKey(valueSchema),
});

const hasChangedValue = (
  change: typeof ChangeFieldsSchema.Type
): true | string =>
  change.value !== undefined ||
  change.darkValue !== undefined ||
  "a change needs value or darkValue";

const changeSchema = ChangeFieldsSchema.check(
  Schema.makeFilter(hasChangedValue)
);

const ChangeListSchema = Schema.Array(changeSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_CHANGES)
);

const RequestSchema = Schema.Struct({ changes: ChangeListSchema });

const parseChangesRequest = toParser(RequestSchema, "error");

function invalid(message: string): DirectEditError {
  return new DirectEditError("invalid_request", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toChange(raw: typeof changeSchema.Type): TokenChange {
  const change: TokenChange = { path: raw.path };

  if (raw.value !== undefined) {
    change.value = raw.value;
  }

  if (raw.darkValue !== undefined) {
    change.darkValue = raw.darkValue;
  }

  return change;
}

export function parseTokenChanges(raw: unknown): TokenChange[] {
  const parsed = parseChangesRequest(raw);

  if (!parsed.isValid) {
    const detail = toIssueLines("", parsed.issues)
      .map((line) => line.trim())
      .join("; ");

    throw invalid(`Invalid token changes: ${detail}`);
  }

  const changes = parsed.value.changes.map(toChange);
  const seen = new Set<string>();

  for (const change of changes) {
    if (seen.has(change.path)) {
      throw invalid(`${change.path} appears more than once`);
    }

    seen.add(change.path);
  }

  return changes;
}

function tokenNodeAt(file: TokenFile, path: string): TokenNode | null {
  let node: unknown = file;

  for (const segment of path.split(".")) {
    if (
      !isRecord(node) ||
      segment.startsWith("$") ||
      !Object.hasOwn(node, segment)
    ) {
      return null;
    }

    node = node[segment];
  }

  return isRecord(node) && "$value" in node ? node : null;
}

function checkValue(group: string, label: string, value: string): void {
  if (WHOLE_ALIAS.test(value)) {
    return;
  }

  const check = Object.hasOwn(VALUE_CHECKS, group)
    ? VALUE_CHECKS[group as TokenGroupName]
    : null;

  const problem = check
    ? check(value)
    : UNSAFE.test(value)
      ? "must not contain ; { } < > or \\"
      : null;

  if (problem) {
    throw invalid(`${label} "${value}" ${problem}`);
  }
}

export function validateTokenChanges(
  file: TokenFile,
  changes: TokenChange[]
): void {
  for (const change of changes) {
    if (tokenNodeAt(file, change.path) === null) {
      throw new DirectEditError(
        "unknown_token",
        `${change.path} is not a token of this design system`,
        404
      );
    }

    const group = change.path.split(".")[0] ?? "";

    if (change.value !== undefined) {
      checkValue(group, `${change.path} value`, change.value);
    }

    if (typeof change.darkValue !== "string") {
      continue;
    }

    if (group !== "color") {
      throw invalid(
        `${change.path}: darkValue is only allowed for color tokens`
      );
    }

    checkValue(group, `${change.path} darkValue`, change.darkValue);
  }
}

function setDark(node: TokenNode, dark: string): void {
  const extensions = isRecord(node.$extensions) ? node.$extensions : {};
  const modes = isRecord(extensions[MODES]) ? extensions[MODES] : {};
  modes.dark = dark;
  extensions[MODES] = modes;
  node.$extensions = extensions;
}

function removeDark(node: TokenNode): void {
  const extensions = node.$extensions;

  if (!isRecord(extensions) || !isRecord(extensions[MODES])) {
    return;
  }

  const modes = extensions[MODES];
  delete modes.dark;

  if (Object.keys(modes).length === 0) {
    delete extensions[MODES];
  }

  if (Object.keys(extensions).length === 0) {
    delete node.$extensions;
  }
}

export function applyTokenChanges(
  file: TokenFile,
  changes: TokenChange[]
): TokenFile {
  const next = structuredClone(file);

  for (const change of changes) {
    const node = tokenNodeAt(next, change.path);

    if (node === null) {
      continue;
    }

    if (change.value !== undefined) {
      node.$value = change.value;
    }

    if (change.darkValue === null) {
      removeDark(node);
    } else if (change.darkValue !== undefined) {
      setDark(node, change.darkValue);
    }
  }

  return next;
}

export function changeVarNames(changes: TokenChange[]): string[] {
  return changes.map((change) => cssVarFor(change.path.split(".")));
}
