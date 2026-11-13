import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";

interface ShareLanPromptProps {
  readonly isBusy: boolean;
  readonly onLan: (isOn: boolean) => void;
}

const ShareLanPrompt = ({
  isBusy,
  onLan,
}: ShareLanPromptProps): ReactElement => {
  const turnOn = useCallback((): void => {
    onLan(true);
  }, [onLan]);

  return (
    <div className="share-lan-prompt" data-testid="share-lan-prompt">
      <span className="share-qr-slot" aria-hidden="true" />
      <div className="share-lan-prompt-body">
        <button
          type="button"
          className="btn"
          disabled={isBusy}
          data-tip={copy.turnOnLocalNetworkTip}
          onClick={turnOn}
        >
          {copy.turnOnLocalNetwork}
        </button>
        <p className="share-lan-prompt-note">{copy.phoneAccessNote}</p>
      </div>
    </div>
  );
};

export { ShareLanPrompt };
