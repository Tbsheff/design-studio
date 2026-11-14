import type { Project } from "@design-studio/contracts";
import { IMAGE_SEARCH_SETTING } from "@design-studio/contracts/image-search";

import { imageSearchEnv } from "../platform/config/index.js";

const PHOTO_ON_RULE = `Keep icons and shapes inline (SVG, CSS). Image search is on. For photos, when \`apply_image_search\` is in your tools, write \`data-photo\` slots: \`<img data-photo="<2 to 6 search words>" alt="..." width="..." height="...">\`, or \`data-photo\` on an element with a background, and call \`apply_image_search\` once with the page path after the first draft. Without that tool, write a gray box: a div with \`data-photo\` and a short label. Never write an <img> without a src that stays empty, and never reference a file that does not exist.`;

const PHOTO_ART_RULE = `Keep icons and shapes inline (SVG, CSS). Image search is off: where a photo goes, write a \`data-photo\` slot with a short label, a div with \`data-photo="<2 to 6 search words>"\`, a size and the label as its text; the studio paints it with art from the page colors. Never write an <img> without a src, and never reference a file that does not exist.`;

const PHOTO_OFF_RULE = `Keep icons and shapes inline (SVG, CSS). Image search is off: where a photo goes, write a gray box, a div with \`data-photo="<2 to 6 search words>"\` and a short label. Never write an <img> without a src, and never reference a file that does not exist.`;

const HTML_ENTRY = /\.html?$/iu;

const isHtmlEntry = (project: Project): boolean =>
  HTML_ENTRY.test(project.entry);

const isPhotoSearchOn = (project: Project): boolean =>
  imageSearchEnv().trim().toLowerCase() === "on" ||
  Object.entries(project.settings).some(
    ([key, value]) => key === IMAGE_SEARCH_SETTING && value === true
  );

const toPhotoRule = (project: Project): string => {
  if (isPhotoSearchOn(project)) {
    return PHOTO_ON_RULE;
  }

  if (isHtmlEntry(project)) {
    return PHOTO_ART_RULE;
  }

  return PHOTO_OFF_RULE;
};

export { isHtmlEntry, isPhotoSearchOn, toPhotoRule };
