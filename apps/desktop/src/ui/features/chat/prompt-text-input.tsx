import { useCallback } from "react";
import type { ClipboardEvent, ReactElement } from "react";

import { ComposerInput } from "../../ai/components/ai/composer-input.js";
import { INPUT_COPY } from "./prompt-box-model.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import { inputPlaceholder } from "./prompt-send-model.js";
import type { PromptBase } from "./use-prompt-base.js";
import type { PromptInput } from "./use-prompt-input.js";
import type { PromptSending } from "./use-prompt-sending.js";
import type { PromptSlash } from "./use-prompt-slash.js";

const toDescribedBy = (
  spoken: string | null,
  reasonId: string
): string | undefined => {
  if (spoken) {
    return reasonId;
  }
};

const PromptTextInput = ({
  box,
  base,
  input,
  slash,
  sending,
}: {
  box: PromptBoxProps;
  base: PromptBase;
  input: PromptInput;
  slash: PromptSlash;
  sending: PromptSending;
}): ReactElement => {
  const { addFiles, draft, mode, setDraft } = base;
  const { resetHistory } = input.keys;
  const { send } = sending;
  const { inputProps } = slash.slash;

  const onValueChange = useCallback(
    (value: string): void => {
      resetHistory();
      setDraft(value);
    },
    [resetHistory, setDraft]
  );

  const onPaste = useCallback(
    (event: ClipboardEvent): void => {
      const images = [...event.clipboardData.files].filter((file) =>
        file.type.startsWith("image/")
      );

      if (images.length > 0) {
        event.preventDefault();
        addFiles(images);
      }
    },
    [addFiles]
  );

  return (
    <ComposerInput
      extraClass="composer-input min-h-16"
      value={draft}
      aria-label={INPUT_COPY[mode].label}
      placeholder={inputPlaceholder(
        box.running,
        box.waitReason,
        INPUT_COPY[mode].placeholder
      )}
      maxRows={9}
      aria-describedby={toDescribedBy(sending.status.spoken, base.reasonId)}
      aria-activedescendant={inputProps["aria-activedescendant"]}
      aria-autocomplete={inputProps["aria-autocomplete"]}
      aria-controls={inputProps["aria-controls"]}
      onValueChange={onValueChange}
      onSubmit={send}
      onPaste={onPaste}
    />
  );
};

export { PromptTextInput };
