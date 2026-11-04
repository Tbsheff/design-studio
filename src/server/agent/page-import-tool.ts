import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import {
  PAGE_IMPORT_NAME_MAX,
  PAGE_IMPORT_SELECTOR_MAX,
  PAGE_IMPORT_URL_MAX,
  PAGE_IMPORT_WIDTH_DEFAULT,
  PAGE_IMPORT_WIDTH_MAX,
  PAGE_IMPORT_WIDTH_MIN,
} from "../page-import/deps.js";
import { PageImportError } from "../page-import/errors.js";
import { importPage } from "../page-import/import-page.js";
import {
  IMPORT_PAGE_DESCRIPTION,
  toImportRequest,
} from "../page-import/input.js";
import type { ImportPageInput } from "../page-import/input.js";
import { refusal } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { toOptionalInt, toOptionalText, toTrimmedText } from "./tool-input.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const RUN_SAVES = "The run saves the new page and frame in its version.";

const importPageFields = {
  name: toOptionalText(
    1,
    PAGE_IMPORT_NAME_MAX,
    "Name of the new page; it becomes the file name <slug>.html. Leave out to use the page title."
  ),
  selector: toOptionalText(
    1,
    PAGE_IMPORT_SELECTOR_MAX,
    'CSS selector of one region to copy, for example "header" or "main > section:nth-of-type(2)". Leave out for the whole page.'
  ),
  url: toTrimmedText(1, PAGE_IMPORT_URL_MAX).annotate({
    description:
      "The page to copy: an https URL, or http://localhost:<port>/... for the dev server of an attached app.",
  }),
  width: toOptionalInt(
    PAGE_IMPORT_WIDTH_MIN,
    PAGE_IMPORT_WIDTH_MAX,
    `Viewport width in px (${PAGE_IMPORT_WIDTH_MIN} to ${PAGE_IMPORT_WIDTH_MAX}). Default ${PAGE_IMPORT_WIDTH_DEFAULT}.`
  ),
};

const importPageInput = toSdkFieldSet(importPageFields);

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
