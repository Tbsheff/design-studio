import { readFile } from "node:fs/promises";
import path from "node:path";

import { DevNoteFileSchema } from "@design-studio/actions/dev-note/schema";
import { Option, Schema } from "effect";

import { toNoteLines } from "./engine/to-note-lines.js";

interface HandoffFrame {
  readonly id: string;
  readonly label: string | null;
}

const NO_NOTES = ["No dev notes.", ""];

const decodeDevNoteText = Schema.decodeOption(
  Schema.fromJsonString(DevNoteFileSchema)
);

const getNotesText = async (projectDir: string): Promise<string | null> => {
  try {
    return await readFile(
      path.join(projectDir, "checks", "dev-notes.json"),
      "utf-8"
    );
  } catch {
    return null;
  }
};

const getDevNotesMarkdown = async (
  projectDir: string,
  frames: readonly HandoffFrame[]
): Promise<string[]> => {
  const text = await getNotesText(projectDir);

  if (text === null) {
    return NO_NOTES;
  }

  const file = Option.getOrNull(decodeDevNoteText(text));

  if (file === null) {
    return NO_NOTES;
  }

  return toNoteLines(file.notes, frames);
};

export { getDevNotesMarkdown };

export type { HandoffFrame };
