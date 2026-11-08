import { PAGE_IMPORT_NOTE, PAGE_IMPORT_WIDTH_DEFAULT } from "./deps.js";
import type { PageImportRequest } from "./deps.js";

const IMPORT_PAGE_DESCRIPTION = `Copy a live web page into this HTML project as a new editable static page <slug>.html and add a canvas frame for it. The page loads in a headless browser at the viewport width; the computed styles become a small class stylesheet (only what differs from browser defaults, repeated rules merged, colors and fonts near a project token use the token), and images and fonts are copied into assets/<slug>/ up to a cap. url: https, or a localhost URL for the dev server of an attached app; private network addresses are refused. selector copies one region only. ${PAGE_IMPORT_NOTE} One version and one undo step.`;

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

export { IMPORT_PAGE_DESCRIPTION, toImportRequest };

export type { ImportPageInput };
