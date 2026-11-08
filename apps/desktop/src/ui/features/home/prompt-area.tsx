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
  readonly onChange: (v: string) => void;
  readonly onSubmit: (e: FormEvent) => void;
  readonly onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  readonly describedBy?: string | undefined;
  readonly menuKeys: {
    readonly current:
      | ((e: KeyboardEvent<HTMLTextAreaElement>) => boolean)
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
      onChange={(e) => onChange(e.target.value)}
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (menuKeys.current?.(e)) {
          return;
        }

        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          onSubmit(e);
        }
      }}
      placeholder={placeholder ?? example}
    />
  );
};

export { PromptArea };

export type { PromptAreaProps };
