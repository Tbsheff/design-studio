import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useState } from "react";

import { copy } from "./copy.js";
import { TweaksPanel } from "./tweaks-panel.js";
import type { TweaksDraft } from "./use-tweaks.js";

interface InspectorTweaksProps {
  readonly draft: TweaksDraft;
  readonly isRunning: boolean;
  readonly onSuggest: (prompt?: string) => void;
}

const TweaksPrompt = ({
  isRunning: running,
  onSuggest,
}: {
  readonly isRunning: boolean;
  readonly onSuggest?: (prompt?: string) => void;
}): ReactElement => {
  const [text, setText] = useState("");

  const send = (): void => {
    if (!onSuggest || running) {
      return;
    }

    onSuggest(text.trim() || undefined);
    setText("");
  };

  return (
    <div className="ins-tweaks-empty">
      <p className="ins-tweaks-text">{copy.tweaksAreLiveControlsFor}</p>
      <div className="ins-tweaks-prompt">
        <textarea
          aria-label={copy.describeTheTweaksYouWant}
          placeholder={copy.describeWhatYouWantTo}
          rows={3}
          value={text}
          disabled={!onSuggest}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              if (text.trim()) {
                send();
              }
            }
          }}
        />
        {!text.trim() && (
          <button
            type="button"
            className="btn small ghost ins-tweaks-auto"
            disabled={!onSuggest || running}
            data-tip={copy.claudePicksTheControls}
            onClick={send}
          >
            {copy.letClaudeChoose}
          </button>
        )}
        <button
          type="button"
          className="icon-btn small send"
          aria-label={copy.addTweaksPanel}
          disabled={!onSuggest || running || !text.trim()}
          onClick={send}
        >
          <Icon name="arrowUp" size={14} />
        </button>
      </div>
      {!onSuggest && (
        <p className="ins-note">{copy.tweaksAreNotAvailableHere}</p>
      )}
    </div>
  );
};

const InspectorTweaks = ({
  tweaks,
  isBlocked: blocked = false,
}: {
  readonly tweaks?: InspectorTweaksProps;
  readonly isBlocked: boolean;
}): ReactElement => {
  const controls = tweaks?.draft.state?.controls.length ?? 0;

  if (!tweaks || (tweaks.draft.state && controls === 0)) {
    return (
      <TweaksPrompt
        isRunning={(tweaks?.isRunning ?? false) || blocked}
        onSuggest={tweaks?.onSuggest}
      />
    );
  }

  return (
    <TweaksPanel
      draft={tweaks.draft}
      isRunning={tweaks.isRunning}
      onSuggest={() => tweaks.onSuggest()}
    />
  );
};

export { InspectorTweaks };

export type { InspectorTweaksProps };
