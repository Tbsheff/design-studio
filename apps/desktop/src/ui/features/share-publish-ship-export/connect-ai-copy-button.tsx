import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy as uiCopy } from "./copy.js";

interface ConnectAiCopyButtonProps {
  readonly isCopied: boolean;
  readonly onCopy: () => void;
}

const ConnectAiCopyButton = ({
  isCopied,
  onCopy,
}: ConnectAiCopyButtonProps): ReactElement => (
  <button
    type="button"
    className="btn small has-icon"
    data-testid="connect-ai-copy"
    onClick={onCopy}
  >
    <Icon name={pick(isCopied, "check", "copy")} size={14} />
    <span aria-live="polite">
      {pick(isCopied, uiCopy.copied, uiCopy.copySnippet)}
    </span>
  </button>
);

export { ConnectAiCopyButton };
