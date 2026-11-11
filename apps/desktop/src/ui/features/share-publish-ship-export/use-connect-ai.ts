import { useCallback, useEffect, useState, useTransition } from "react";

import { toAgentNames } from "../../domain/agent-names.js";
import { connectAiApi } from "./connect-ai-api.js";
import type { ConnectSetup } from "./connect-ai-api.js";
import { toErrorText } from "./error-text.js";
import { mcpStatusApi } from "./mcp-status-api.js";
import type { McpStatusInput } from "./mcp-status-api.js";

interface ConnectAiState {
  readonly clients: readonly string[];
  readonly failure: string | null;
  readonly isBusy: boolean;
  readonly rotateToken: () => void;
  readonly setEdits: (isAllowed: boolean) => void;
  readonly setEnabled: (isEnabled: boolean) => void;
  readonly setup: ConnectSetup | null;
}

const useConnectAi = (): ConnectAiState => {
  const [setup, setSetup] = useState<ConnectSetup | null>(null);
  const [clients, setClients] = useState<readonly string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [isBusy, startTransition] = useTransition();

  useEffect(() => {
    let isLive = true;

    const load = async (): Promise<void> => {
      try {
        const [nextSetup, nextClients] = await Promise.all([
          connectAiApi.readSetup(),
          connectAiApi.readClients(),
        ]);

        if (isLive) {
          setSetup(nextSetup);
          setClients(toAgentNames(nextClients));
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
        const status = await mcpStatusApi.write(input);
        setFailure(status.error);
        setSetup(await connectAiApi.readSetup());
      } catch (error) {
        setFailure(toErrorText(error as Error));
      }
    });
  }, []);

  const setEnabled = useCallback(
    (isEnabled: boolean): void => change({ enabled: isEnabled }),
    [change]
  );

  const setEdits = useCallback(
    (isAllowed: boolean): void => change({ edits: isAllowed }),
    [change]
  );

  const rotateToken = useCallback(
    (): void => change({ rotate: true }),
    [change]
  );

  return {
    clients,
    failure,
    isBusy,
    rotateToken,
    setEdits,
    setEnabled,
    setup,
  };
};

export { useConnectAi };

export type { ConnectAiState };
