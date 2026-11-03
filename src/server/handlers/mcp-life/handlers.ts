// @generated
import type { McpLifeActions } from "../../../shared/actions/mcp-life/index.js";
import type { Entries } from "../_core/handler.js";
import {
  handle as answerApprovalMcpLifeHandle,
  preview as answerApprovalMcpLifePreview,
} from "./answer-approval.js";
import { handle as getStatusMcpLifeHandle } from "./get-status.js";
import { handle as listActivityMcpLifeHandle } from "./list-activity.js";
import { handle as listApprovalsMcpLifeHandle } from "./list-approvals.js";
import { handle as setStatusMcpLifeHandle } from "./set-status.js";

const McpLifeEntries = {
  answerApprovalMcpLife: {
    handle: answerApprovalMcpLifeHandle,
    preview: answerApprovalMcpLifePreview,
  },
  getStatusMcpLife: { handle: getStatusMcpLifeHandle },
  listActivityMcpLife: { handle: listActivityMcpLifeHandle },
  listApprovalsMcpLife: { handle: listApprovalsMcpLifeHandle },
  setStatusMcpLife: { handle: setStatusMcpLifeHandle },
} satisfies Entries<typeof McpLifeActions>;

export { McpLifeEntries };
