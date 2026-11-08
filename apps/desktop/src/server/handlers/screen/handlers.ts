// @generated
import type { ScreenActions } from "@design-studio/actions/screen/index";

import type { Entries } from "../_core/handler.js";
import { handle as createScreenHandle } from "./create.js";
import { handle as duplicateScreenHandle } from "./duplicate.js";
import { handle as inspectScreenHandle } from "./inspect.js";

const ScreenEntries = {
  createScreen: { handle: createScreenHandle },
  duplicateScreen: { handle: duplicateScreenHandle },
  inspectScreen: { handle: inspectScreenHandle },
} satisfies Entries<typeof ScreenActions>;

export { ScreenEntries };
