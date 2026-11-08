import type { McpApprovalOutcome } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

const MCP_ACTIVE_MS = 60_000;

const FOLD_AT = 5;

const OUTCOME_VIEW: Record<
  McpApprovalOutcome,
  { readonly icon: IconName; readonly text: string }
> = {
  allow: { icon: "check", text: "Allowed" },
  closed: { icon: "alert", text: "Closed" },
  deny: { icon: "close", text: "Denied" },
  timeout: { icon: "alert", text: "Expired" },
};

export { FOLD_AT, MCP_ACTIVE_MS, OUTCOME_VIEW };
