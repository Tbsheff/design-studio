import { useCallback, useLayoutEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { autosize } from "./composer-autosize";
import { useComposerContext } from "./composer-context";

interface ComposerInputOptions {
  readonly maxRows: number;
  readonly onSubmit: (text: string) => void;
  readonly onValueChange: (text: string) => void;
  readonly submitOnEnter: boolean;
  readonly value: string;
}

interface ComposerInputHandlers {
  readonly handleMarkBlurred: () => void;
  readonly handleMarkFocused: () => void;
  readonly handleReportValue: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleStartComposition: () => void;
  readonly handleStopComposition: () => void;
  readonly handleSubmitKey: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

interface ComposerInputState {
  readonly handlers: ComposerInputHandlers;
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
}

const toIsSubmitKey = (
  event: KeyboardEvent<HTMLTextAreaElement>,
  submitOnEnter: boolean
): boolean => {
  if (submitOnEnter) {
    return !event.shiftKey;
  }

  return event.metaKey || event.ctrlKey;
};

const useComposerInput = (options: ComposerInputOptions): ComposerInputState => {
  const { maxRows, onSubmit, onValueChange, submitOnEnter, value } = options;
  const context = useComposerContext();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);

  useLayoutEffect(() => {
    const field = inputRef.current;

    if (!field) {
      return;
    }

    context.setEmpty(value.trim().length === 0);
    autosize(field, maxRows);
  }, [value, maxRows, context]);

  const submit = useCallback(() => {
    if (!value.trim()) {
      return;
    }

    onSubmit(value);
  }, [onSubmit, value]);

  const handleReportValue = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onValueChange(event.target.value);
    },
    [onValueChange]
  );

  const handleSubmitKey = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.defaultPrevented ||
        event.nativeEvent.isComposing ||
        isComposingRef.current
      ) {
        return;
      }

      if (event.key === "Enter" && toIsSubmitKey(event, submitOnEnter)) {
        event.preventDefault();
        submit();
      }
    },
    [submit, submitOnEnter]
  );

  const handleMarkFocused = useCallback(() => context.setFocused(true), [context]);
  const handleMarkBlurred = useCallback(() => context.setFocused(false), [context]);

  const handleStartComposition = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleStopComposition = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const handlers = {
    handleMarkBlurred,
    handleMarkFocused,
    handleReportValue,
    handleStartComposition,
    handleStopComposition,
    handleSubmitKey,
  };

  return { handlers, inputRef };
};

export { useComposerInput };
