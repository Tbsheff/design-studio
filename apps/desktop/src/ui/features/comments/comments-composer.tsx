import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";
import { useCallback, useState, useTransition } from "react";

import { ComposerRow } from "./composer-row.js";
import {
  toComposerPlaceholder,
  toComposerTarget,
} from "./composer-target-model.js";
import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const MAX_LENGTH = 2000;
const ROWS = 2;

const CommentsComposer = ({
  control,
  selection,
}: {
  control: CommentsControl;
  selection: SelectionContext[];
}): ReactElement => {
  const [text, setText] = useState("");
  const [isBusy, startTransition] = useTransition();
  const target = toComposerTarget(selection);
  const isReady = target !== null && text.trim().length > 0 && !isBusy;
  const { add } = control;

  const submit = useCallback((): void => {
    if (!isReady) {
      return;
    }

    startTransition(async () => {
      if (await add(selection, text.trim(), false)) {
        setText("");
      }
    });
  }, [add, isReady, selection, text]);

  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setText(event.target.value);
    },
    []
  );

  const pressKey = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <div
      className="comments-composer ui-composer"
      data-testid="comments-composer"
    >
      <textarea
        aria-label={copy.add}
        rows={ROWS}
        maxLength={MAX_LENGTH}
        value={text}
        disabled={target === null}
        placeholder={toComposerPlaceholder(target)}
        onChange={changeText}
        onKeyDown={pressKey}
      />
      <ComposerRow control={control} isReady={isReady} onSubmit={submit} />
    </div>
  );
};

export { CommentsComposer };
