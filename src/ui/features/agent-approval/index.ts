import { lazy } from "react";

const ApprovalCard = lazy(async () => {
  const mod = await import("./approval-card.js");

  return { default: mod.ApprovalCard };
});

export { ApprovalCard };
