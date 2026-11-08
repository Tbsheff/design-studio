import { useCallback, useEffect, useState, useTransition } from "react";

import { toErrorText } from "./error-text.js";
import { mcpStatusApi } from "./mcp-status-api.js";
import type { McpStatusInput, McpStatusOutput } from "./mcp-status-api.js";

interface McpStatusState {
  readonly status: McpStatusOutput | null;
  readonly isBusy: boolean;
  readonly failure: string | null;
  readonly setEnabled: (isEnabled: boolean) => void;
  readonly setEdits: (isAllowed: boolean) => void;
  readonly rotateToken: () => void;
}

const useMcpStatus = (): McpStatusState => {
  const [status, setStatus] = useState<McpStatusOutput | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isBusy, startTransition] = useTransition();

  useEffect(() => {
    let isLive = true;

    const load = async (): Promise<void> => {
      try {
        const next = await mcpStatusApi.read();

        if (isLive) {
          setStatus(next);
        }
      } catch (error) {
        if (isLive) {
          setFailure(toErrorText(error as Error));
        }
      }
    };

    void load();

    return (): void => {
      isLive = false;
    };
  }, []);

  const change = useCallback((input: McpStatusInput): void => {
    setFailure(null);
    startTransition(async () => {
      try {
        setStatus(await mcpStatusApi.write(input));
      } catch (error) {
        setFailure(toErrorText(error as Error));
      }
    });
  }, []);

  const setEnabled = useCallback(
    (isEnabled: boolean): void => {
      change({ enabled: isEnabled });
    },
    [change]
  );

  const setEdits = useCallback(
    (isAllowed: boolean): void => {
      change({ edits: isAllowed });
    },
    [change]
  );

  const rotateToken = useCallback((): void => {
    change({ rotate: true });
  }, [change]);

  return { failure, isBusy, rotateToken, setEdits, setEnabled, status };
};

export { useMcpStatus };
