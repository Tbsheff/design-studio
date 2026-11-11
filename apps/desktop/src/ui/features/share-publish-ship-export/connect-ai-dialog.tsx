import { useModalDialog } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { useBackdropDismiss } from "../../platform/use-backdrop-dismiss.js";
import { ConnectAiBody } from "./connect-ai-body.js";
import { ConnectAiHead } from "./connect-ai-head.js";
import { copy as uiCopy } from "./copy.js";
import { useConnectAi } from "./use-connect-ai.js";

interface ConnectAiDialogProps {
  readonly onClose: () => void;
}

const ConnectAiDialog = ({ onClose }: ConnectAiDialogProps): ReactElement => {
  const state = useConnectAi();

  const close = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(close);
  useBackdropDismiss(ref, close);

  return (
    <dialog
      ref={ref}
      className="modal connect-ai"
      aria-label={uiCopy.connectAi}
      data-testid="connect-ai-dialog"
    >
      <ConnectAiHead onClose={onClose} />
      <ConnectAiBody state={state} />
    </dialog>
  );
};

export { ConnectAiDialog };

export type { ConnectAiDialogProps };
