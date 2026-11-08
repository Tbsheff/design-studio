import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  ReactElement,
} from "react";

import { RUN_TITLE_MAX } from "../../../shared/rewind.js";
import { copy } from "./copy.js";

const TitleField = ({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (title: string | null) => void;
}): ReactElement => {
  const [text, setText] = useState(initial);
  const done = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const finish = useCallback(
    (value: string | null): void => {
      if (done.current) {
        return;
      }

      done.current = true;
      onDone(value);
    },
    [onDone]
  );

  const selectText = useCallback(
    (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select(),
    []
  );

  const updateText = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setText(event.target.value),
    []
  );

  const commitText = useCallback(() => finish(text.trim()), [finish, text]);

  const handleTitleKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      event.stopPropagation();

      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        finish(text.trim());
      }

      if (event.key === "Escape") {
        finish(null);
      }
    },
    [finish, text]
  );

  return (
    <input
      ref={ref}
      className="run-title-input"
      aria-label={copy.runName}
      placeholder={copy.nameThisRun}
      maxLength={RUN_TITLE_MAX}
      value={text}
      onFocus={selectText}
      onChange={updateText}
      onBlur={commitText}
      onKeyDown={handleTitleKey}
    />
  );
};

export { TitleField };
