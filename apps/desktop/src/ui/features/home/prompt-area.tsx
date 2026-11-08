import { useLayoutEffect, useRef } from "react";
import type {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  ReactElement,
} from "react";

import { copy } from "./copy.js";
import { useExample } from "./use-example.js";

interface PromptAreaProps {
  readonly value: string;
  readonly onChange: (valueArg: string) => void;
  readonly onSubmit: (formEvent: FormEvent) => void;
  readonly onPaste: (
    clipboardEvent: ClipboardEvent<HTMLTextAreaElement>
  ) => void;
  readonly describedBy?: string | undefined;
  readonly menuKeys: {
    readonly current:
      | ((keyboardEvent: KeyboardEvent<HTMLTextAreaElement>) => boolean)
      | null;
  };
  readonly placeholder: string | null;
}

const PromptArea = ({
  value,
  onChange,
  onSubmit,
  onPaste,
  describedBy,
  menuKeys,
  placeholder,
}: PromptAreaProps): ReactElement => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const example = useExample(value !== "", placeholder === null);
  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    el.style.height = "auto";
    el.style.height = `${Math.min(320, el.scrollHeight)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      aria-label={copy.describeTheDesign}
      aria-describedby={describedBy}
      rows={2}
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onPaste={onPaste}
      onKeyDown={(eventArg) => {
        if (menuKeys.current?.(eventArg)) {
          return;
        }

        if (
          eventArg.key === "Enter" &&
          !eventArg.shiftKey &&
          !eventArg.nativeEvent.isComposing
        ) {
          onSubmit(eventArg);
        }
      }}
      placeholder={placeholder ?? example}
    />
  );
};

export { PromptArea };

export type { PromptAreaProps };
