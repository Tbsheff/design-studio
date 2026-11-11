import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type { ConnectSetup } from "./connect-ai-api.js";
import { ConnectAiCopyButton } from "./connect-ai-copy-button.js";
import { toClientSnippet, toConnectClient } from "./connect-ai-model.js";
import type { ConnectClientId } from "./connect-ai-model.js";
import { copy as uiCopy } from "./copy.js";
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

  const snippet = useMemo(
    () => toClientSnippet(clientId, setup),
    [clientId, setup]
  );

  const copySnippet = useCallback((): void => {
    void copyText(clientId, snippet);
  }, [clientId, copyText, snippet]);

  return (
    <section className="connect-ai-snippet" aria-label={client.title}>
      <p className="export-sub">{client.step}</p>
      {!setup.isEnabled && (
        <p className="connect-ai-warn">{uiCopy.connectAiOff}</p>
      )}
      <div className="connect-ai-code">
        <pre data-testid="connect-ai-code">{snippet}</pre>
        <ConnectAiCopyButton
          isCopied={copied === clientId}
          onCopy={copySnippet}
        />
      </div>
    </section>
  );
};

export { ConnectAiSnippet };
