const PAGE_IMPORT_WIDTH_MIN = 320;
const PAGE_IMPORT_WIDTH_MAX = 2560;
const PAGE_IMPORT_WIDTH_DEFAULT = 1440;
const PAGE_IMPORT_SELECTOR_MAX = 500;
const PAGE_IMPORT_URL_MAX = 2000;
const PAGE_IMPORT_NAME_MAX = 60;
const PAGE_IMPORT_NODES_MAX = 5000;
const PAGE_IMPORT_ASSETS_MAX = 60;
const PAGE_IMPORT_ASSET_BYTES_MAX = 4_194_304;
const PAGE_IMPORT_TOTAL_BYTES_MAX = 24_194_304;
const PAGE_IMPORT_FONT_FACES_MAX = 24;
const PAGE_IMPORT_DEADLINE_MS = 45_000;

const PAGE_IMPORT_NOTE =
  "The page is a static copy for redesign, not a live link: scripts, iframes, form actions and trackers are removed, and the copy never updates from the site.";

interface PageImportRequest {
  readonly url: string;
  readonly width: number;
  readonly selector: string | null;
  readonly name: string | null;
}

interface PageImportResult {
  readonly page: string;
  readonly frameId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly width: number;
  readonly height: number;
  readonly elements: number;
  readonly classes: number;
  readonly tokens: number;
  readonly assets: readonly string[];
  readonly skippedAssets: readonly string[];
  readonly removed: readonly string[];
  readonly truncated: boolean;
  readonly versionId: string | null;
  readonly note: string;
}

export {
  PAGE_IMPORT_ASSET_BYTES_MAX,
  PAGE_IMPORT_ASSETS_MAX,
  PAGE_IMPORT_DEADLINE_MS,
  PAGE_IMPORT_FONT_FACES_MAX,
  PAGE_IMPORT_NAME_MAX,
  PAGE_IMPORT_NODES_MAX,
  PAGE_IMPORT_NOTE,
  PAGE_IMPORT_SELECTOR_MAX,
  PAGE_IMPORT_TOTAL_BYTES_MAX,
  PAGE_IMPORT_URL_MAX,
  PAGE_IMPORT_WIDTH_DEFAULT,
  PAGE_IMPORT_WIDTH_MAX,
  PAGE_IMPORT_WIDTH_MIN,
};

export type { PageImportRequest, PageImportResult };
