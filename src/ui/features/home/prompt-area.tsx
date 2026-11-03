import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
} from "react";

import { useExample } from "./use-example.js";

interface PromptAreaProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  describedBy?: string | undefined;
  menuKeys: {
    current: ((e: KeyboardEvent<HTMLTextAreaElement>) => boolean) | null;
  };
  placeholder: string | null;
}

function PromptArea({
  value,
  onChange,
  onSubmit,
  onPaste,
  describedBy,
  menuKeys,
  placeholder,
}: PromptAreaProps) {
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
      aria-label="Describe the design"
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
}

export { PromptArea };

export type { PromptAreaProps };
