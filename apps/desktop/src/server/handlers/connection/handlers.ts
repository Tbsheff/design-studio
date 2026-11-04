// @generated
import type { ConnectionActions } from "@design-studio/actions/connection/index";
import type { Entries } from "../_core/handler.js";
import { handle as getStatusConnectionHandle } from "./get-status.js";
import { handle as listActivityConnectionHandle } from "./list-activity.js";
import { handle as listApprovalsConnectionHandle } from "./list-approvals.js";
import { handle as setApprovalConnectionHandle } from "./set-approval.js";
import { handle as setStatusConnectionHandle } from "./set-status.js";

const ConnectionEntries = {
  getStatusConnection: { handle: getStatusConnectionHandle },
  listActivityConnection: { handle: listActivityConnectionHandle },
  listApprovalsConnection: { handle: listApprovalsConnectionHandle },
  setApprovalConnection: { handle: setApprovalConnectionHandle },
  setStatusConnection: { handle: setStatusConnectionHandle },
} satisfies Entries<typeof ConnectionActions>;

export { ConnectionEntries };
