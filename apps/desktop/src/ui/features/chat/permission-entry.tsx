import type { PermissionRequest } from "@design-studio/contracts";
import { Suspense } from "react";
import type { ReactElement } from "react";

import { ApprovalCard } from "../../chat-slots.js";
import { PermissionPrompt } from "./permission-prompt.js";

const PermissionEntry = ({
  projectId,
  request,
  runId,
}: {
  projectId: string;
  request: PermissionRequest;
  runId: string;
}): ReactElement => {
  if (request.card) {
    return (
      <Suspense fallback={null}>
        <ApprovalCard projectId={projectId} runId={runId} request={request} />
      </Suspense>
    );
  }

  return (
    <PermissionPrompt projectId={projectId} runId={runId} request={request} />
  );
};

export { PermissionEntry };
