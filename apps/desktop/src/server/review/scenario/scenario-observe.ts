import { Schema } from "effect";

import type { RecordedResponse } from "../../app/index.js";
import { toMergedList } from "./engine/index.js";
import type {
  ObservedCall,
  StringFormat,
  Structure,
  Transformer,
} from "./engine/index.js";

type JsonObject = Readonly<Record<string, Schema.Json>>;

interface EntryStructure {
  readonly structure: Structure | null;
  readonly transformer: Transformer;
}

const TRPC_MARK = "/trpc/";
const MAX_DEPTH = 8;
const MAX_FIELDS = 40;
const SAMPLE_ELEMENTS = 5;
const SAMPLE_VALUES = 3;
const MAX_DIGITS_IN_KEY = 2;
const MAX_DIGITS_IN_SEGMENT = 2;
const LONG_SEGMENT = 10;
const MAX_PATH = 300;
const MAX_FAILED_STATUS = 400;

const SAFE_KEY = /^[A-Za-z_$][\w$.-]{0,39}$/u;
const PROCEDURE_NAME = /^[\w.-]{1,80}$/u;
const ID_SEGMENT = /^(?:\d+|[0-9a-f]{12,}|[0-9a-f]{8}-[0-9a-f-]{27})$/iu;

const STRING_FORMATS: readonly (readonly [StringFormat, RegExp])[] = [
  ["uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu],
  ["datetime", /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/u],
  ["date", /^\d{4}-\d{2}-\d{2}$/u],
  ["url", /^https?:\/\//u],
];

const SUPERJSON_KEYS: ReadonlySet<string> = new Set(["json", "meta"]);

const isText = Schema.is(Schema.String);

const isNumber = Schema.is(Schema.Number);

const isFlag = Schema.is(Schema.Boolean);

const isScalar = (value: Schema.Json): boolean =>
  isText(value) || isNumber(value) || isFlag(value);

const isObject = (value: Schema.Json): value is JsonObject =>
  value !== null && !Array.isArray(value) && !isScalar(value);

const ID_TOKEN = /^[\w-]+$/u;
const MIN_ID_LENGTH = 16;

const isEmail = (text: string): boolean => {
  const parts = text.split("@");

  const [name = "", domain = ""] = parts;

  return (
    parts.length === 2 &&
    name !== "" &&
    domain.includes(".") &&
    !/\s/u.test(text)
  );
};

const toStringFormat = (text: string): StringFormat => {
  if (isEmail(text)) {
    return "email";
  }

  for (const [format, pattern] of STRING_FORMATS) {
    if (pattern.test(text)) {
      return format;
    }
  }

  if (text.length >= MIN_ID_LENGTH && ID_TOKEN.test(text) && /\d/u.test(text)) {
    return "id";
  }

  return "plain";
};

const isSafeKey = (key: string): boolean =>
  SAFE_KEY.test(key) && (key.match(/\d/gu)?.length ?? 0) <= MAX_DIGITS_IN_KEY;

const toStructure = (value: Schema.Json, depth: number): Structure => {
  if (Array.isArray(value)) {
    const sample = value
      .slice(0, SAMPLE_ELEMENTS)
      .map((element: Schema.Json) => toStructure(element, depth + 1));

    return {
      element: toMergedList(sample),
      kind: "array",
      length: value.length,
    };
  }

  if (isText(value)) {
    return { format: toStringFormat(value), kind: "string" };
  }

  if (isNumber(value) && Number.isInteger(value)) {
    return { kind: "integer" };
  }

  if (isNumber(value)) {
    return { kind: "number" };
  }

  if (isFlag(value)) {
    return { kind: "boolean" };
  }

  if (!isObject(value) || depth >= MAX_DEPTH) {
    return { kind: "null" };
  }

  const keys = Object.keys(value);

  if (keys.length > MAX_FIELDS || !keys.every((key) => isSafeKey(key))) {
    const sample = keys
      .slice(0, SAMPLE_VALUES)
      .map((key) => toStructure(value[key] ?? null, depth + 1));

    return { kind: "record", value: toMergedList(sample) };
  }

  const fields = keys.map((key) => ({
    key,
    structure: toStructure(value[key] ?? null, depth + 1),
  }));

  return { fields, kind: "object" };
};

const isIdSegment = (segment: string): boolean => {
  if (ID_SEGMENT.test(segment) || segment.includes("%")) {
    return true;
  }

  if (segment.includes("@")) {
    return true;
  }

  return (
    segment.length >= LONG_SEGMENT &&
    (segment.match(/\d/gu)?.length ?? 0) > MAX_DIGITS_IN_SEGMENT
  );
};

const toNormalPath = (pathname: string): string =>
  pathname
    .split("/")
    .map((segment) => {
      if (segment !== "" && isIdSegment(segment)) {
        return ":id";
      }

      return segment;
    })
    .join("/")
    .slice(0, MAX_PATH);

const toProcedures = (pathname: string): string[] | null => {
  const at = pathname.indexOf(TRPC_MARK);

  if (at === -1) {
    return null;
  }

  const tail = pathname.slice(at + TRPC_MARK.length).replaceAll(/%2c/giu, ",");

  if (tail === "") {
    return null;
  }

  return tail.split(",");
};

const isSuperjson = (data: JsonObject): boolean => {
  const keys = Object.keys(data);

  return keys.includes("json") && keys.every((key) => SUPERJSON_KEYS.has(key));
};

const toEntryStructure = (entry: Schema.Json): EntryStructure => {
  if (!isObject(entry)) {
    return { structure: null, transformer: "none" };
  }

  const result = entry.result ?? null;

  if (!isObject(result)) {
    return { structure: null, transformer: "none" };
  }

  const data = result.data ?? null;

  if (isObject(data) && isSuperjson(data)) {
    return {
      structure: toStructure(data.json ?? null, 0),
      transformer: "superjson",
    };
  }

  return { structure: toStructure(data, 0), transformer: "plain" };
};

const toEntries = (
  response: RecordedResponse,
  count: number
): readonly Schema.Json[] => {
  if (Array.isArray(response.body)) {
    return response.body;
  }

  if (count === 1 && response.body !== null) {
    return [response.body];
  }

  return [];
};

const toTrpcCalls = (
  response: RecordedResponse,
  procedures: readonly string[]
): ObservedCall[] => {
  const mark = response.pathname.indexOf(TRPC_MARK) + TRPC_MARK.length;
  const prefix = response.pathname.slice(0, mark);
  const entries = toEntries(response, procedures.length);

  return procedures.flatMap((procedure, at) => {
    if (!PROCEDURE_NAME.test(procedure)) {
      return [];
    }

    const { method, status } = response;
    const { structure, transformer } = toEntryStructure(entries[at] ?? null);
    const path = `${prefix}${procedure}`.slice(0, MAX_PATH);

    return [{ method, path, procedure, status, structure, transformer }];
  });
};

const toPlainCall = (response: RecordedResponse): ObservedCall => {
  const { method, status } = response;
  const isUsable = status < MAX_FAILED_STATUS && response.body !== null;
  const path = toNormalPath(response.pathname);
  const procedure = null;
  const transformer = "none";
  let structure: Structure | null = null;

  if (isUsable) {
    structure = toStructure(response.body, 0);
  }

  return { method, path, procedure, status, structure, transformer };
};

const toObservedCalls = (response: RecordedResponse): ObservedCall[] => {
  const procedures = toProcedures(response.pathname);

  if (procedures === null) {
    return [toPlainCall(response)];
  }

  return toTrpcCalls(response, procedures);
};

export { toNormalPath, toObservedCalls };
