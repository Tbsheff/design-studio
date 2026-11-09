import type { createCodeEditView } from "./code-edit-view-model.js";
import { copy } from "./copy.js";

type CodeEditStatus =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly hash: string;
      readonly isSaved: boolean;
      readonly text: string;
    }
  | {
      readonly kind: "failed";
      readonly hash: string;
      readonly message: string;
      readonly text: string;
    }
  | { readonly kind: "conflict"; readonly hash: string; readonly text: string }
  | { readonly kind: "error"; readonly message: string };

interface LanguageOptions {
  readonly isJsx: boolean;
  readonly isTypescript: boolean;
}

const TS_EXT = new Set(["ts", "tsx", "mts", "cts"]);
const JSX_EXT = new Set(["tsx", "jsx", "js", "mjs", "cjs", "html", "htm"]);
const SCRIPT_EXT = new Set(["js", "mjs", "cjs", "jsx", ...TS_EXT]);

const toReadyStatus = (
  loaded: { readonly hash: string; readonly text: string },
  isSaved: boolean
): CodeEditStatus => ({ ...loaded, isSaved, kind: "ready" });

const toHashOf = (status: CodeEditStatus): string | null => {
  if (status.kind === "loading" || status.kind === "error") {
    return null;
  }

  return status.hash;
};

const toTextOf = (status: CodeEditStatus): string | null => {
  if (status.kind === "loading" || status.kind === "error") {
    return null;
  }

  return status.text;
};

const toSaveLabel = (isPending: boolean): string => {
  if (isPending) {
    return copy.codeEditSaving;
  }

  return copy.codeEditSave;
};

const toLanguageOptions = (file: string): LanguageOptions | null => {
  const ext = file.split(".").pop()?.toLowerCase() ?? "";

  if (!SCRIPT_EXT.has(ext)) {
    return null;
  }

  return { isJsx: JSX_EXT.has(ext), isTypescript: TS_EXT.has(ext) };
};

const toCodeEditView = async (): Promise<typeof createCodeEditView> => {
  const loaded = await import("./code-edit-view-model.js");

  return loaded.createCodeEditView;
};

const toLineStart = (lineCount: number, line: number): number =>
  Math.min(Math.max(line, 1), Math.max(lineCount, 1));

export {
  toCodeEditView,
  toHashOf,
  toLanguageOptions,
  toLineStart,
  toReadyStatus,
  toSaveLabel,
  toTextOf,
};

export type { CodeEditStatus, LanguageOptions };
