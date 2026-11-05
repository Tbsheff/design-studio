// @generated
import type { ComponentVariantActions } from "@design-studio/actions/component-variant/index";

import type { Entries } from "../_core/handler.js";
import { handle as createComponentVariantHandle } from "./create.js";
import { handle as getComponentVariantHandle } from "./get.js";
import { handle as updateComponentVariantHandle } from "./update.js";

const ComponentVariantEntries = {
  createComponentVariant: { handle: createComponentVariantHandle },
  getComponentVariant: { handle: getComponentVariantHandle },
  updateComponentVariant: { handle: updateComponentVariantHandle },
} satisfies Entries<typeof ComponentVariantActions>;

export { ComponentVariantEntries };
