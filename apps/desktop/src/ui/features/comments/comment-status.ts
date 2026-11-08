import type { DesignComment } from "./deps.js";

const STATUS_LABEL: Record<DesignComment["status"], string> = {
  draft: "Draft",
  orphaned: "Element not found",
  queued: "Queued",
  resolved: "Resolved",
  sent: "Sent to Claude",
};

export { STATUS_LABEL };
