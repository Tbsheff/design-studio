import type { ClipboardEventHandler, ReactElement } from "react";

import { cn } from "../../lib/utils";
import { useComposerInput } from "./use-composer-input";

interface ComposerInputProps {
  readonly "aria-activedescendant"?: string;
  readonly "aria-autocomplete"?: "list";
  readonly "aria-controls"?: string;
  readonly "aria-describedby"?: string;
  readonly "aria-label"?: string;
  readonly className?: string;
  readonly maxRows?: number;
  readonly onPaste?: ClipboardEventHandler<HTMLTextAreaElement>;
  readonly onSubmit: (text: string) => void;
  readonly onValueChange: (text: string) => void;
  readonly placeholder?: string;
  readonly submitOnEnter?: boolean;
  readonly value: string;
}

const DEFAULT_MAX_ROWS = 8;

const ComposerInput = ({
  className,
  maxRows = DEFAULT_MAX_ROWS,
  onPaste,
  onSubmit,
  onValueChange,
  placeholder,
  submitOnEnter = true,
  value,
  ...aria
}: ComposerInputProps): ReactElement => {
  const { handlers, inputRef } = useComposerInput({
    maxRows,
    onSubmit,
    onValueChange,
    submitOnEnter,
    value,
  });

  return (
    <textarea
      aria-activedescendant={aria["aria-activedescendant"]}
      aria-autocomplete={aria["aria-autocomplete"]}
      aria-controls={aria["aria-controls"]}
      aria-describedby={aria["aria-describedby"]}
      aria-label={aria["aria-label"]}
      className={cn(
        "w-full resize-none outline-none bg-transparent",
        "min-h-9 px-3 py-2 text-sm leading-relaxed text-foreground",
        "placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed",
        className
      )}
      data-slot="composer-input"
      onBlur={handlers.handleMarkBlurred}
      onChange={handlers.handleReportValue}
      onCompositionEnd={handlers.handleStopComposition}
      onCompositionStart={handlers.handleStartComposition}
      onFocus={handlers.handleMarkFocused}
      onKeyDown={handlers.handleSubmitKey}
      onPaste={onPaste}
      placeholder={placeholder}
      ref={inputRef}
      rows={1}
      value={value}
    />
  );
};

export { ComposerInput };
