// @generated
import type { DesignRuleActions } from "@design-studio/actions/design-rule/index";

import type { Entries } from "../_core/handler.js";
import { handle as createDesignRuleHandle } from "./create.js";

const DesignRuleEntries = {
  createDesignRule: { handle: createDesignRuleHandle },
} satisfies Entries<typeof DesignRuleActions>;

export { DesignRuleEntries };
