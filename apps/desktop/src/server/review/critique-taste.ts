import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import { toJsonOrNull } from "./critique-json.js";

const ACTIVE_GLOBAL = `SELECT p.data FROM preferences p LEFT JOIN retired r ON r.preference_id = p.id
  WHERE r.preference_id IS NULL AND p.scope = 'global' ORDER BY p.created_at, p.id`;

const TasteRowSchema = Schema.Struct({
  area: Schema.optionalKey(Schema.String),
  kind: Schema.Literals(["prefer", "avoid"]),
  rule: Schema.String,
});

const MAX_RULES = 40;

const decodeRow = toDecoder(TasteRowSchema, "ignore");

const toLine = (data: string): string[] => {
  const json = toJsonOrNull(data);

  if (json === null) {
    return [];
  }

  const decoded = decodeRow(json);

  if (decoded._tag === "Failure" || decoded.success.rule.trim() === "") {
    return [];
  }

  const { area, kind, rule } = decoded.success;

  return [`${kind} (${area ?? "general"}): ${rule.trim()}`];
};

const toLibraryFile = (): string =>
  path.join(os.homedir(), ".design-memory", "library.sqlite3");

const hasFile = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const listTasteLines = async (): Promise<string[]> => {
  const file = toLibraryFile();

  if (!(await hasFile(file))) {
    return [];
  }

  let db: DatabaseSync | null = null;

  try {
    db = new DatabaseSync(file, { readOnly: true });

    const rows = db.prepare(ACTIVE_GLOBAL).all() as { data: string }[];

    return rows.flatMap((row) => toLine(row.data)).slice(0, MAX_RULES);
  } catch {
    return [];
  } finally {
    db?.close();
  }
};

export { listTasteLines };
