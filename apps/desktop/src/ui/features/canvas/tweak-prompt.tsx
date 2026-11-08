import { Icon } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactElement,
} from "react";

import { copy } from "./copy.js";
import { useTweakDismiss } from "./use-tweak-dismiss.js";

const toPlaceholder = (scope: string | null): string => {
  if (scope) {
    return `Describe a tweak to ${scope}…`;
  }

  return "Describe a tweak…";
};

const TweakPrompt = ({
  scope,
  onSend,
  onClose,
}: {
  scope: string | null;
  onSend: (text: string) => void;
  onClose: () => void;
}): ReactElement => {
  const [text, setText] = useState("");
  const root = useRef<HTMLFormElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useTweakDismiss(root, field, onClose);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const prompt = text.trim();

      if (!prompt) {
        return;
      }

      onSend(prompt);
      setText("");
      onClose();
    },
    [text, onSend, onClose]
  );

  const updateText = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setText(event.target.value),
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    [onClose]
  );

  return (
    <form
      ref={root}
      className="tweak-prompt ui-popover"
      onSubmit={handleSubmit}
    >
      <input
        ref={field}
        name="tweak"
        aria-label={copy.describeATweak}
        placeholder={toPlaceholder(scope)}
        value={text}
        onChange={updateText}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className="icon-btn small send"
        aria-label={copy.sendTweak}
        disabled={!text.trim()}
      >
        <Icon name="arrowUp" size={14} />
      </button>
    </form>
  );
};

export { TweakPrompt };
