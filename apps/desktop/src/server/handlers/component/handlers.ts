// @generated
import type { ComponentActions } from "@design-studio/actions/component/index";

import type { Entries } from "../_core/handler.js";
import { handle as importComponentHandle } from "./import.js";

const ComponentEntries = {
  importComponent: { handle: importComponentHandle },
} satisfies Entries<typeof ComponentActions>;

export { ComponentEntries };
