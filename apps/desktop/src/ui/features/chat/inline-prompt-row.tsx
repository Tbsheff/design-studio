import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement, Ref } from "react";

import { copy } from "./copy.js";

const TARGET_ICON = 12;

interface InlinePromptRowProps {
  readonly blocked: string | null;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly isReady: boolean;
  readonly label: string;
  readonly onSubmit: () => void;
  readonly onText: (text: string) => void;
  readonly text: string;
}

const toPlaceholder = (blocked: string | null): string =>
  blocked ?? "Ask for a change…";

const toSendTip = (blocked: string | null): string => blocked ?? "Send (Enter)";

const InlinePromptRow = ({
  label,
  blocked,
  text,
  isReady,
  inputRef,
  onText,
  onSubmit,
}: InlinePromptRowProps): ReactElement => {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onText(event.target.value);
    },
    [onText]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    <div className="inline-prompt-row">
      <span className="inline-prompt-target" data-tip={copy.theRunEdits}>
        <Icon name="sparkle" size={TARGET_ICON} />
        <span className="inline-prompt-target-text">{label}</span>
      </span>
      <input
        ref={inputRef}
        className="inline-prompt-input"
        value={text}
        placeholder={toPlaceholder(blocked)}
        aria-label={`Ask the agent about ${label}`}
        spellCheck={false}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="inline-prompt-send"
        disabled={!isReady}
        data-tip={toSendTip(blocked)}
        aria-label={copy.send}
        onClick={onSubmit}
      >
        {copy.text7}
      </button>
    </div>
  );
};

export { InlinePromptRow };
