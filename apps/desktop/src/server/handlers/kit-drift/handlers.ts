// @generated
import type { KitDriftActions } from "@design-studio/actions/kit-drift/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyKitDriftHandle } from "./apply.js";
import { handle as listKitDriftHandle } from "./list.js";

const KitDriftEntries = {
  applyKitDrift: { handle: applyKitDriftHandle },
  listKitDrift: { handle: listKitDriftHandle },
} satisfies Entries<typeof KitDriftActions>;

export { KitDriftEntries };
