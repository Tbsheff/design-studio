import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { pick } from "./pick.js";
import { useCopied } from "./use-copied.js";

interface ConnectCommandRowProps {
  readonly command: string;
}

const COPY_KEY = "mcp";

const ConnectCommandRow = ({
  command,
}: ConnectCommandRowProps): ReactElement => {
  const [copied, copyText] = useCopied();
  const isCopied = copied === COPY_KEY;

  const copyCommand = useCallback((): void => {
    void copyText(COPY_KEY, command);
  }, [command, copyText]);

  return (
    <div className="export-command" data-tip={command}>
      <code className="truncate">{command}</code>
      <button
        type="button"
        className="btn small has-icon"
        onClick={copyCommand}
      >
        <Icon name={pick(isCopied, "check", "copy")} size={14} />
        <span aria-live="polite">
          {pick(isCopied, uiCopy.copied, uiCopy.copyCommand)}
        </span>
      </button>
    </div>
  );
};

export { ConnectCommandRow };
