import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";

import { toDecoder } from "./deps.js";
import { JSON_SUFFIX, toPatternFolder } from "./pattern-paths.js";

const NAME_LIMIT = 30;

const NameFileSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.optionalKey(Schema.String),
  name: Schema.String,
  tags: Schema.optionalKey(Schema.Array(Schema.String)),
});

const decodeNameFile = toDecoder(
  Schema.fromJsonString(NameFileSchema),
  "ignore"
);

const toLine = (text: string): string | null => {
  const decoded = decodeNameFile(text);

  if (decoded._tag === "Failure") {
    return null;
  }

  const found = decoded.success;

  const tags = found.tags ?? [];
  let suffix = "";

  if (tags.length > 0) {
    suffix = ` [${tags.join(", ")}]`;
  }

  return `${found.name} (${found.id}, ${found.kind ?? "react"})${suffix}`;
};

const getText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const getFileNames = async (folder: string): Promise<readonly string[]> => {
  try {
    return await readdir(folder);
  } catch {
    return [];
  }
};

const listPatternNames = async (): Promise<readonly string[]> => {
  const folder = toPatternFolder();
  const names = await getFileNames(folder);

  const lines = await Promise.all(
    names
      .filter((name) => name.endsWith(JSON_SUFFIX))
      .slice(0, NAME_LIMIT)
      .map(async (name) => toLine(await getText(path.join(folder, name))))
  );

  return lines.filter((line): line is string => line !== null);
};

export { listPatternNames };
