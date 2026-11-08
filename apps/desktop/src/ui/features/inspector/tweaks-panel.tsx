import { PanelHead } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { ColorValue } from "../versions-layers-tokens/token-inputs.js";
import { copy } from "./copy.js";
import { TweaksBody } from "./tweaks-body.js";
import { TweaksHeaderEnd } from "./tweaks-header-end.js";
import { toGroupControls } from "./tweaks-model.js";
import { TweakColorSlot } from "./use-tweak-color-slot.js";
import type { TweaksDraft } from "./use-tweaks.js";

const TweaksPanel = ({
  draft,
  isRunning,
  onSuggest,
}: {
  readonly draft: TweaksDraft;
  readonly isRunning: boolean;
  readonly onSuggest: () => void;
}): ReactElement => {
  const { state, discard } = draft;

  const groups = useMemo(
    () => toGroupControls(state?.controls ?? []),
    [state?.controls]
  );

  return (
    <div className="twk">
      <PanelHead
        title={copy.tabTweaks}
        headClass="twk-header"
        titleClassName="twk-title"
      >
        <TweaksHeaderEnd
          count={draft.count}
          isRunning={isRunning}
          hasControls={groups.length > 0}
          onDiscard={discard}
          onSuggest={onSuggest}
        />
      </PanelHead>
      <TweakColorSlot.Provider value={ColorValue}>
        <TweaksBody
          draft={draft}
          groups={groups}
          isRunning={isRunning}
          onSuggest={onSuggest}
        />
      </TweakColorSlot.Provider>
    </div>
  );
};

export { TweaksPanel };
