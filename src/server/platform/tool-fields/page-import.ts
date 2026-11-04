import { z } from "zod";

import {
  PAGE_IMPORT_NAME_MAX,
  PAGE_IMPORT_SELECTOR_MAX,
  PAGE_IMPORT_URL_MAX,
  PAGE_IMPORT_WIDTH_DEFAULT,
  PAGE_IMPORT_WIDTH_MAX,
  PAGE_IMPORT_WIDTH_MIN,
} from "../../../shared/page-import.js";

const importPageFields = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(PAGE_IMPORT_NAME_MAX)
    .optional()
    .describe(
      "Name of the new page; it becomes the file name <slug>.html. Leave out to use the page title."
    ),
  selector: z
    .string()
    .trim()
    .min(1)
    .max(PAGE_IMPORT_SELECTOR_MAX)
    .optional()
    .describe(
      'CSS selector of one region to copy, for example "header" or "main > section:nth-of-type(2)". Leave out for the whole page.'
    ),
  url: z
    .string()
    .trim()
    .min(1)
    .max(PAGE_IMPORT_URL_MAX)
    .describe(
      "The page to copy: an https URL, or http://localhost:<port>/... for the dev server of an attached app."
    ),
  width: z
    .number()
    .int()
    .min(PAGE_IMPORT_WIDTH_MIN)
    .max(PAGE_IMPORT_WIDTH_MAX)
    .optional()
    .describe(
      `Viewport width in px (${PAGE_IMPORT_WIDTH_MIN} to ${PAGE_IMPORT_WIDTH_MAX}). Default ${PAGE_IMPORT_WIDTH_DEFAULT}.`
    ),
};

export { importPageFields };
