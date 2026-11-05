// @generated
import type { ImageSearchActions } from "@design-studio/actions/image-search/index";

import type { Entries } from "../_core/handler.js";
import { handle as getImageSearchHandle } from "./get.js";
import { handle as insertImageSearchHandle } from "./insert.js";
import { handle as inspectImageSearchHandle } from "./inspect.js";

const ImageSearchEntries = {
  getImageSearch: { handle: getImageSearchHandle },
  insertImageSearch: { handle: insertImageSearchHandle },
  inspectImageSearch: { handle: inspectImageSearchHandle },
} satisfies Entries<typeof ImageSearchActions>;

export { ImageSearchEntries };
