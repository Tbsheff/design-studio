import { Result, SchemaIssue } from "effect";
import type { Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import type {
  DecodableSchema,
  ExcessProperty,
} from "../platform/decode/index.js";

interface ParseIssue {
  readonly message: string;
  readonly path: string;
}

type Parsed<Value> =
  | { readonly isValid: false; readonly issues: readonly ParseIssue[] }
  | { readonly isValid: true; readonly value: Value };

const ROOT_PATH = "(root)";

const toIssueFormatter = SchemaIssue.makeFormatterStandardSchemaV1();

type PathSegment = PropertyKey | { readonly key: PropertyKey };

const toSegmentText = (segment: PathSegment): string => {
  if (segment instanceof Object && "key" in segment) {
    return String(segment.key);
  }

  return String(segment);
};

const toPathText = (path: readonly PathSegment[] | undefined): string => {
  const keys = (path ?? []).map((segment) => toSegmentText(segment));

  if (keys.length === 0) {
    return ROOT_PATH;
  }

  return keys.join(".");
};

const toIssues = (error: Schema.SchemaError): readonly ParseIssue[] =>
  toIssueFormatter(error.issue).issues.map((issue) => ({
    message: issue.message,
    path: toPathText(issue.path),
  }));

const toParser = <Item extends DecodableSchema>(
  schema: Item,
  excess: ExcessProperty
): (<Raw>(raw: Raw) => Parsed<Item["Type"]>) => {
  const decode = toDecoder(schema, excess);

  return (raw) => {
    const result = decode(raw);

    if (Result.isSuccess(result)) {
      return { isValid: true, value: result.success };
    }

    return { isValid: false, issues: toIssues(result.failure) };
  };
};

const toIssueLines = (
  prefix: string,
  issues: readonly ParseIssue[]
): string[] =>
  issues.map((issue) => `${prefix} ${issue.path}: ${issue.message}`);

export { toIssueLines, toParser };

export type { ParseIssue, Parsed };
