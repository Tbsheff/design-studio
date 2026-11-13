import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toPlaceholder } from "./selection-prompt-model.js";

const SEND_ICON = 12;

interface SelectionPromptRowProps {
  readonly isRunning: boolean;
  readonly label: string;
  readonly onSubmit: () => void;
  readonly onText: (text: string) => void;
  readonly text: string;
}

const focusInput = (node: HTMLTextAreaElement | null): void => {
  node?.focus({ preventScroll: true });
};

const SelectionPromptRow = ({
  isRunning,
  label,
  onSubmit,
  onText,
  text,
}: SelectionPromptRowProps): ReactElement => {
  const isReady = text.trim().length > 0 && !isRunning;

  const updateText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onText(event.target.value);
    },
    [onText]
  );

  const sendOnEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    <div className="selection-prompt-row">
      <span className="selection-prompt-target">{label}</span>
      <textarea
        ref={focusInput}
        className="selection-prompt-input"
        rows={1}
        value={text}
        placeholder={toPlaceholder(isRunning, copy.selectionPrompt)}
        aria-label={copy.selectionPrompt.inputLabel}
        spellCheck={false}
        onChange={updateText}
        onKeyDown={sendOnEnter}
      />
      <button
        type="button"
        className="selection-prompt-send"
        disabled={!isReady}
        aria-label={copy.selectionPrompt.send}
        data-tip={copy.selectionPrompt.sendTip}
        onClick={onSubmit}
      >
        <Icon name="play" size={SEND_ICON} />
      </button>
    </div>
  );
};

export { SelectionPromptRow };
