// @generated
import type { DesignRuleActions } from "@design-studio/actions/design-rule/index";

import type { Entries } from "../_core/handler.js";
import { handle as createDesignRuleHandle } from "./create.js";
import { handle as inspectProposalsDesignRuleHandle } from "./inspect-proposals.js";
import { handle as setProposalDesignRuleHandle } from "./set-proposal.js";

const DesignRuleEntries = {
  createDesignRule: { handle: createDesignRuleHandle },
  inspectProposalsDesignRule: { handle: inspectProposalsDesignRuleHandle },
  setProposalDesignRule: { handle: setProposalDesignRuleHandle },
} satisfies Entries<typeof DesignRuleActions>;

export { DesignRuleEntries };
