import { Schema } from "effect";

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

type PackEntry = typeof PackEntrySchema.Type;

type AppEntry = typeof AppEntrySchema.Type;

const isAppEntry = Schema.is(AppEntrySchema);

const isPackEntry = Schema.is(PackEntrySchema);

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

const toPackToken = (entry: PackEntry): ExportToken | null => {
  if (entry.value.trim() === "") {
    return null;
  }

  return {
    cssVar: entry.cssVar,
    dark: entry.dark,
    path: entry.token,
    type: entry.type,
    value: entry.value,
  };
};

const toTokenList = (token: ExportToken | null): ExportToken[] => {
  if (token === null) {
    return [];
  }

  return [token];
};

const toViewTokens = (entries: readonly unknown[]): readonly ExportToken[] =>
  entries.flatMap((entry) => {
    if (isAppEntry(entry)) {
      return toTokenList(toAppToken(entry));
    }

    if (isPackEntry(entry)) {
      return toTokenList(toPackToken(entry));
    }

    return [];
  });

export { toViewTokens };
