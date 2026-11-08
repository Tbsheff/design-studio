import { useCallback, useState, useTransition } from "react";
import type { ReactElement } from "react";

import { errorText } from "../../api.js";
import { copy } from "./copy.js";
import { mcpApi } from "./mcp-model.js";

const DisconnectButton = (): ReactElement => {
  const [isDone, setIsDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback((): void => {
    setError(null);
    startTransition(async () => {
      try {
        await mcpApi.disconnect();
        setIsDone(true);
      } catch (thrownError: unknown) {
        setError(errorText(thrownError));
      }
    });
  }, []);

  if (isDone) {
    return <span className="mcp-block-note">{copy.editsOff}</span>;
  }

  return (
    <>
      {error && (
        <span className="mcp-block-error" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        className="mcp-block-btn"
        disabled={isPending}
        data-tip={copy.turnOffAllow}
        data-tip-align="end"
        onClick={disconnect}
      >
        {copy.disconnect}
      </button>
    </>
  );
};

export { DisconnectButton };
