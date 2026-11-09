import { readFile } from "node:fs/promises";
import path from "node:path";

import { SpellingWordListSchema } from "@design-studio/actions/spelling/schema";
import { Result, Schema } from "effect";

import { writeAtomic } from "../../platform/atomic-write/index.js";
import { toDecoder } from "../../platform/decode/index.js";
import { assertSafeId } from "../../platform/errors/index.js";
import { createKeyedMutex } from "../../platform/mutex/index.js";

const FILE_NAME = "spelling-words.json";
const SEED_FILES = ["DESIGN.md", "GLOSSARY.md"] as const;

type WordList = typeof SpellingWordListSchema.Type;

const EMPTY_LIST: WordList = { words: [] };

const decodeList = toDecoder(
  Schema.fromJsonString(SpellingWordListSchema),
  "ignore"
);

const mutex = createKeyedMutex();

const toWordsPath = (projectDir: string): string =>
  path.join(projectDir, FILE_NAME);

const toCleanWords = (words: readonly string[]): string[] => {
  const clean = new Set<string>();

  for (const word of words) {
    const trimmed = word.trim();

    if (trimmed !== "") {
      clean.add(trimmed);
    }
  }

  return [...clean];
};

const getList = async (file: string): Promise<WordList> => {
  try {
    const text = await readFile(file, "utf-8");

    return Result.getOrElse(decodeList(text), () => EMPTY_LIST);
  } catch {
    return EMPTY_LIST;
  }
};

const getSpellingWords = async (projectDir: string): Promise<string[]> => {
  const list = await getList(toWordsPath(projectDir));

  return toCleanWords(list.words);
};

const setSpellingWords = (
  projectDir: string,
  projectId: string,
  words: readonly string[]
): Promise<string[]> =>
  mutex(projectDir, async (): Promise<string[]> => {
    assertSafeId(projectId, "projectId");
    const clean = toCleanWords(words);

    await writeAtomic(
      toWordsPath(projectDir),
      `${JSON.stringify({ words: clean }, null, 2)}\n`,
      { cleanup: "always", createDir: true }
    );

    return clean;
  });

const getSpellingSeedTexts = async (workTree: string): Promise<string[]> => {
  const texts = await Promise.all(
    SEED_FILES.map(async (name): Promise<string> => {
      try {
        return await readFile(path.join(workTree, name), "utf-8");
      } catch {
        return "";
      }
    })
  );

  return texts.filter((text) => text !== "");
};

export { getSpellingWords, getSpellingSeedTexts, setSpellingWords };
