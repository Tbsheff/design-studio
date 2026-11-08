import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { TweaksPromptActions } from "./tweaks-prompt-actions.js";

type SuggestHandler = (...prompt: [] | [string]) => void;

interface TweaksPromptProps {
  readonly isRunning: boolean;
  readonly onSuggest: SuggestHandler | null;
}

const TWEAKS_ROWS = 3;

const TweaksPrompt = ({
  isRunning,
  onSuggest,
}: TweaksPromptProps): ReactElement => {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  const handleSend = useCallback((): void => {
    if (!onSuggest || isRunning) {
      return;
    }

    if (trimmed) {
      onSuggest(trimmed);
    } else {
      onSuggest();
    }

    setText("");
  }, [onSuggest, isRunning, trimmed]);

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value),
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();

        if (trimmed) {
          handleSend();
        }
      }
    },
    [trimmed, handleSend]
  );

  return (
    <div className="ins-tweaks-empty">
      <p className="ins-tweaks-text">{copy.tweaksAreLiveControlsFor}</p>
      <div className="ins-tweaks-prompt">
        <textarea
          aria-label={copy.describeTheTweaksYouWant}
          placeholder={copy.describeWhatYouWantTo}
          rows={TWEAKS_ROWS}
          value={text}
          disabled={!onSuggest}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
        />
        <TweaksPromptActions
          canSend={Boolean(onSuggest)}
          hasText={Boolean(trimmed)}
          isRunning={isRunning}
          onSend={handleSend}
        />
      </div>
      {!onSuggest && (
        <p className="ins-note">{copy.tweaksAreNotAvailableHere}</p>
      )}
    </div>
  );
};

export { TweaksPrompt };

export type { SuggestHandler };
