import { parseRows } from "@design-studio/contracts/parse-rows";
import type { ParseFailureCode } from "@design-studio/contracts/parse-rows";

import type { ContentRuntime } from "./content-runtime.js";
import { applyRows } from "./engine/index.js";
import { runEdit } from "./write-content.js";
import type {
  ContentComputed,
  ContentRefused,
  ContentWritten,
} from "./write-content.js";

interface ImportCommand {
  readonly col: number;
  readonly columns: readonly number[] | null;
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly projectId: string;
  readonly text: string;
}

const TITLE = "Fill from data";

const PARSE_TEXT: Readonly<Record<ParseFailureCode, string>> = {
  bad_json: "The JSON is not an array of objects or arrays.",
  empty: "The pasted data has no rows.",
  too_big: "The pasted data is over 100 KB.",
  too_many_rows: "The pasted data has more than 200 rows.",
};

const toImportEdit =
  (command: ImportCommand) =>
  (original: string): ContentComputed => {
    const parsed = parseRows(command.text);

    if (!parsed.ok) {
      return { refused: PARSE_TEXT[parsed.code] };
    }

    const result = applyRows(original, {
      col: command.col,
      columns: command.columns,
      line: command.line,
      rows: parsed.rows,
    });

    if (!result.ok) {
      return { refused: result.message };
    }

    return result.value;
  };

const runImport = (
  runtime: ContentRuntime,
  command: ImportCommand
): Promise<ContentRefused | ContentWritten> =>
  runEdit(runtime, command, {
    compute: toImportEdit(command),
    file: command.file,
    prompt: `${TITLE}: ${command.text.length} characters`,
    title: TITLE,
  });

export { runImport };

export type { ImportCommand };
