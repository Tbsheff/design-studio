import { readFile } from "node:fs/promises";

import type { ZodType } from "zod";

type TextWriter = (file: string, text: string) => Promise<void>;

const readJsonFile = async <Value>(
  file: string,
  schema: ZodType<Value>
): Promise<Value | null> => {
  try {
    const text = await readFile(file, "utf-8");

    return schema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
};

const serializeJson = <Value>(value: Value): string =>
  `${JSON.stringify(value, null, 2)}\n`;

const writeJsonFile = async <Value>(
  file: string,
  value: Value,
  write: TextWriter
): Promise<void> => {
  await write(file, serializeJson(value));
};

export { readJsonFile, serializeJson, writeJsonFile };

export type { TextWriter };
