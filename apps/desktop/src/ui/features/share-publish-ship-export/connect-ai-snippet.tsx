import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type { ConnectSetup } from "./connect-ai-api.js";
import { ConnectAiCopyButton } from "./connect-ai-copy-button.js";
import {
  toClientSnippet,
  toConnectClient,
  toMaskedSnippet,
} from "./connect-ai-model.js";
import type { ConnectClientId } from "./connect-ai-model.js";
import { useCopied } from "./use-copied.js";

interface ConnectAiSnippetProps {
  readonly clientId: ConnectClientId;
  readonly setup: ConnectSetup;
}

const ConnectAiSnippet = ({
  clientId,
  setup,
}: ConnectAiSnippetProps): ReactElement => {
  const [copied, copyText] = useCopied();
  const client = toConnectClient(clientId);

  const shownSnippet = useMemo(
    () => toMaskedSnippet(clientId, setup),
    [clientId, setup]
  );

  const copySnippet = useCallback((): void => {
    void copyText(clientId, toClientSnippet(clientId, setup));
  }, [clientId, copyText, setup]);

  return (
    <div className="connect-ai-snippet">
      <p className="export-sub">{client.step}</p>
      <div className="connect-ai-code">
        <pre data-testid="connect-ai-code">{shownSnippet}</pre>
        <ConnectAiCopyButton
          isCopied={copied === clientId}
          onCopy={copySnippet}
        />
      </div>
    </div>
  );
};

export { ConnectAiSnippet };
