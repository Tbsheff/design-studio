// @generated
import { getSetupConnection } from "./get-setup.js";
import { getStatusConnection } from "./get-status.js";
import { listActivityConnection } from "./list-activity.js";
import { listApprovalsConnection } from "./list-approvals.js";
import { setApprovalConnection } from "./set-approval.js";
import { setStatusConnection } from "./set-status.js";

const ConnectionActions = {
  getSetupConnection,
  getStatusConnection,
  listActivityConnection,
  listApprovalsConnection,
  setApprovalConnection,
  setStatusConnection,
} as const;

export { ConnectionActions };
