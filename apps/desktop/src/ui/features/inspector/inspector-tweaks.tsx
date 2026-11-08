import { useCallback } from "react";
import type { ReactElement } from "react";

import { TweaksPanel } from "./tweaks-panel.js";
import { TweaksPrompt } from "./tweaks-prompt.js";
import type { SuggestHandler } from "./tweaks-prompt.js";
import type { TweaksDraft } from "./use-tweaks.js";

interface InspectorTweaksProps {
  readonly draft: TweaksDraft;
  readonly isRunning: boolean;
  readonly onSuggest: SuggestHandler;
}

const InspectorTweaks = ({
  tweaks,
  isBlocked,
}: {
  readonly tweaks?: InspectorTweaksProps;
  readonly isBlocked: boolean;
}): ReactElement => {
  const controls = tweaks?.draft.state?.controls.length ?? 0;
  const suggest = tweaks?.onSuggest;

  const handleSuggest = useCallback(() => {
    suggest?.();
  }, [suggest]);

  if (!tweaks || (tweaks.draft.state && controls === 0)) {
    return (
      <TweaksPrompt
        isRunning={(tweaks?.isRunning ?? false) || isBlocked}
        onSuggest={suggest ?? null}
      />
    );
  }

  return (
    <TweaksPanel
      draft={tweaks.draft}
      isRunning={tweaks.isRunning}
      onSuggest={handleSuggest}
    />
  );
};

export { InspectorTweaks };

export type { InspectorTweaksProps };
