import { useCallback } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  ReactElement,
  RefObject,
} from "react";

import { prefetchStudio } from "../../app/screen-preload.js";
import { copy } from "./copy.js";
import {
  EXAMPLE_HINT_ID,
  toExamples,
  toPromptDescribedBy,
} from "./home-model.js";
import { useExampleTake } from "./use-example-take.js";
import { useExample } from "./use-example.js";
import { usePromptElement } from "./use-prompt-element.js";
import { useStarters } from "./use-starters.js";

interface PromptAreaProps {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (formEvent: FormEvent) => void;
  readonly onPaste: (
    clipboardEvent: ClipboardEvent<HTMLTextAreaElement>
  ) => void;
  readonly describedBy: string | null;
  readonly menuKeys: {
    readonly current:
      | ((keyboardEvent: KeyboardEvent<HTMLTextAreaElement>) => boolean)
      | null;
  };
  readonly placeholder: string | null;
}

const isSubmitKey = (event: KeyboardEvent<HTMLTextAreaElement>): boolean =>
  event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing;

const PromptArea = ({
  textareaRef,
  value,
  onChange,
  onSubmit,
  onPaste,
  describedBy,
  menuKeys,
  placeholder,
}: PromptAreaProps): ReactElement => {
  const isExampleShown = value === "" && placeholder === null;
  usePromptElement(
    textareaRef,
    value,
    toPromptDescribedBy(describedBy, isExampleShown)
  );
  const example = useExample(toExamples(useStarters()), !isExampleShown);
  let shown: string | null = null;

  if (isExampleShown) {
    shown = example;
  }

  const takeExample = useExampleTake(shown, value, onChange);

  const updateValue = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      void prefetchStudio();
      onChange(event.target.value);
    },
    [onChange]
  );

  const submitOnEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (menuKeys.current?.(event) || takeExample(event)) {
        return;
      }

      if (isSubmitKey(event)) {
        onSubmit(event);
      }
    },
    [menuKeys, onSubmit, takeExample]
  );

  return (
    <>
      <textarea
        ref={textareaRef}
        aria-label={copy.describeTheDesign}
        rows={2}
        autoFocus
        value={value}
        onChange={updateValue}
        onPaste={onPaste}
        onKeyDown={submitOnEnter}
        placeholder={placeholder ?? `${example}${copy.tabToUse}`}
      />
      {isExampleShown && (
        <span id={EXAMPLE_HINT_ID} className="sr-only">
          {copy.exampleTabHint}
        </span>
      )}
    </>
  );
};

export { PromptArea };

export type { PromptAreaProps };
