import type { McpApprovalOutcome } from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";
import { pick } from "../../platform/pick.js";
import { mcpApi } from "./mcp-model.js";
import type { McpApprovalCard } from "./use-mcp-feed.js";

interface McpApprovalState {
  readonly allow: () => void;
  readonly allowFolder: () => void;
  readonly deny: () => void;
  readonly error: string | null;
  readonly isPending: boolean;
  readonly local: McpApprovalOutcome | null;
}

const useMcpApproval = (
  card: McpApprovalCard,
  onAnswer: ((allow: boolean) => void) | null
): McpApprovalState => {
  const [local, setLocal] = useState<McpApprovalOutcome | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { folder, id: approvalId } = card.approval;

  const answer = useCallback(
    (isAllowed: boolean, trusted: string | null): void => {
      setError(null);
      startTransition(async () => {
        try {
          if (trusted !== null) {
            await mcpApi.trustFolder(trusted);
          }

          await mcpApi.answer(approvalId, isAllowed);
          setLocal(pick(isAllowed, "allow", "deny"));
          onAnswer?.(isAllowed);
        } catch (thrownError: unknown) {
          const text = errorText(thrownError);

          if (/not open/u.test(text)) {
            setLocal("timeout");
          } else {
            setError(text);
          }
        }
      });
    },
    [approvalId, onAnswer]
  );

  const allow = useCallback((): void => answer(true, null), [answer]);
  const deny = useCallback((): void => answer(false, null), [answer]);

  const allowFolder = useCallback(
    (): void => answer(true, folder),
    [answer, folder]
  );

  return { allow, allowFolder, deny, error, isPending, local };
};

export { useMcpApproval };
