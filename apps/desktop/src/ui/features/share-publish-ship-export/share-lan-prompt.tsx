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
    <div className="share-lan-prompt">
      <button
        type="button"
        className="btn ghost"
        disabled={isBusy}
        data-tip={copy.turnOnLocalNetworkTip}
        onClick={turnOn}
      >
        {copy.turnOnLocalNetwork}
      </button>
    </div>
  );
};

export { ShareLanPrompt };
