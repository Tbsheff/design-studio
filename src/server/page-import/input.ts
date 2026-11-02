import { z } from "zod";

import {
  PAGE_IMPORT_NAME_MAX,
  PAGE_IMPORT_NOTE,
  PAGE_IMPORT_SELECTOR_MAX,
  PAGE_IMPORT_URL_MAX,
  PAGE_IMPORT_WIDTH_DEFAULT,
  PAGE_IMPORT_WIDTH_MAX,
  PAGE_IMPORT_WIDTH_MIN,
} from "./deps.js";
import type { PageImportRequest } from "./deps.js";

const IMPORT_PAGE_DESCRIPTION = `Copy a live web page into this HTML project as a new editable static page <slug>.html and add a canvas frame for it. The page loads in a headless browser at the viewport width; the computed styles become a small class stylesheet (only what differs from browser defaults, repeated rules merged, colors and fonts near a project token use the token), and images and fonts are copied into assets/<slug>/ up to a cap. url: https, or a localhost URL for the dev server of an attached app; private network addresses are refused. selector copies one region only. ${PAGE_IMPORT_NOTE} One version and one undo step.`;

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

interface ImportPageInput {
  readonly url: string;
  readonly width?: number | undefined;
  readonly selector?: string | undefined;
  readonly name?: string | undefined;
}

const toImportRequest = (input: ImportPageInput): PageImportRequest => ({
  name: input.name ?? null,
  selector: input.selector ?? null,
  url: input.url,
  width: input.width ?? PAGE_IMPORT_WIDTH_DEFAULT,
});

export { IMPORT_PAGE_DESCRIPTION, importPageFields, toImportRequest };

export type { ImportPageInput };
