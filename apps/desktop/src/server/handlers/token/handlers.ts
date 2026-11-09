// @generated
import type { TokenActions } from "@design-studio/actions/token/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyTokenHandle } from "./apply.js";
import {
  handle as deleteTokenHandle,
  preview as deleteTokenPreview,
} from "./delete.js";
import { handle as exportTokenHandle } from "./export.js";
import { handle as listClassesTokenHandle } from "./list-classes.js";
import { handle as listUsageTokenHandle } from "./list-usage.js";
import { handle as renameTokenHandle } from "./rename.js";
import { handle as setTokenHandle } from "./set.js";

const TokenEntries = {
  applyToken: { handle: applyTokenHandle },
  deleteToken: { handle: deleteTokenHandle, preview: deleteTokenPreview },
  exportToken: { handle: exportTokenHandle },
  listClassesToken: { handle: listClassesTokenHandle },
  listUsageToken: { handle: listUsageTokenHandle },
  renameToken: { handle: renameTokenHandle },
  setToken: { handle: setTokenHandle },
} satisfies Entries<typeof TokenActions>;

export { TokenEntries };
