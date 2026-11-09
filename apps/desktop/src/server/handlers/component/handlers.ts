// @generated
import type { ComponentActions } from "@design-studio/actions/component/index";

import type { Entries } from "../_core/handler.js";
import { handle as importComponentHandle } from "./import.js";
import { handle as listUsageComponentHandle } from "./list-usage.js";

const ComponentEntries = {
  importComponent: { handle: importComponentHandle },
  listUsageComponent: { handle: listUsageComponentHandle },
} satisfies Entries<typeof ComponentActions>;

export { ComponentEntries };
