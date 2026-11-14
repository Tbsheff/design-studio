// @generated
import type { FontActions } from "@design-studio/actions/font/index";

import type { Entries } from "../_core/handler.js";
import { handle as listFontHandle } from "./list.js";

const FontEntries = {
  listFont: { handle: listFontHandle },
} satisfies Entries<typeof FontActions>;

export { FontEntries };
