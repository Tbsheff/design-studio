import { Option, Schema } from "effect";

import { toAliasVar } from "./engine/token-model.js";
import type { ExportToken } from "./engine/token-model.js";

const PackEntrySchema = Schema.Struct({
  cssVar: Schema.String,
  dark: Schema.NullOr(Schema.String),
  token: Schema.String,
  type: Schema.String,
  value: Schema.String,
});

const AppEntrySchema = Schema.Struct({
  dark: Schema.NullOr(Schema.String),
  darkResolved: Schema.NullOr(Schema.String),
  path: Schema.String,
  resolved: Schema.String,
  token: Schema.String,
  type: Schema.String,
  value: Schema.String,
});

const readAppEntry = Schema.decodeUnknownOption(AppEntrySchema);

const readPackEntry = Schema.decodeUnknownOption(PackEntrySchema);

type AppEntry = typeof AppEntrySchema.Type;

const toAppValue = (
  raw: string | null,
  resolved: string | null
): string | null => {
  if (raw !== null && toAliasVar(raw) !== null) {
    return raw;
  }

  return resolved ?? raw;
};

const toAppToken = (entry: AppEntry): ExportToken | null => {
  const value = toAppValue(entry.value, entry.resolved);

  if (value === null || value.trim() === "") {
    return null;
  }

  return {
    cssVar: entry.token,
    dark: toAppValue(entry.dark, entry.darkResolved),
    path: entry.path,
    type: entry.type,
    value,
  };
};

const toViewToken = (entry: typeof Schema.Unknown.Type): ExportToken | null => {
  const app = readAppEntry(entry);

  if (Option.isSome(app)) {
    return toAppToken(app.value);
  }

  const pack = readPackEntry(entry);

  if (Option.isNone(pack) || pack.value.value.trim() === "") {
    return null;
  }

  return {
    cssVar: pack.value.cssVar,
    dark: pack.value.dark,
    path: pack.value.token,
    type: pack.value.type,
    value: pack.value.value,
  };
};

const toViewTokens = (
  entries: readonly (typeof Schema.Unknown.Type)[]
): readonly ExportToken[] =>
  entries.flatMap((entry) => {
    const token = toViewToken(entry);

    if (token === null) {
      return [];
    }

    return [token];
  });

export { toViewTokens };
