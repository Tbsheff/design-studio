import { PageImportError } from "../page-import/errors.js";
import { importPage } from "../page-import/import-page.js";
import {
  IMPORT_PAGE_DESCRIPTION,
  importPageFields,
  toImportRequest,
} from "../page-import/input.js";
import type { ImportPageInput } from "../page-import/input.js";
import { refusal } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";

interface ToolText {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

const RUN_SAVES = "The run saves the new page and frame in its version.";

const importPageInput = importPageFields;

const importPageDescription = IMPORT_PAGE_DESCRIPTION;

const textOf = (message: string, isError: boolean): ToolText => {
  if (isError) {
    return { content: [{ text: message, type: "text" }], isError: true };
  }

  return { content: [{ text: message, type: "text" }] };
};

const runImportPage = async (
  deps: DirectToolDeps,
  args: ImportPageInput
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "import_page");

  if (blocked) {
    return textOf(blocked, true);
  }

  if (!deps.canvas) {
    return textOf("The canvas is not available in this run.", true);
  }

  try {
    const done = await importPage(
      {
        canvas: deps.canvas,
        direction: deps.ctx.direction,
        project: deps.ctx.project,
      },
      toImportRequest(args),
      null
    );

    return textOf(
      JSON.stringify({ ...done.result, saved: RUN_SAVES }, null, 2),
      false
    );
  } catch (error) {
    if (error instanceof PageImportError) {
      return textOf(`import_page: ${error.message}`, true);
    }

    throw error;
  }
};

export { importPageDescription, importPageInput, runImportPage };
