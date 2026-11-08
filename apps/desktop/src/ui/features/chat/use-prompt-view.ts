import type { PromptBoxProps } from "./prompt-box-props.js";
import type { PromptBase } from "./use-prompt-base.js";
import { usePromptInput } from "./use-prompt-input.js";
import type { PromptInput } from "./use-prompt-input.js";
import { usePromptSending } from "./use-prompt-sending.js";
import type { PromptLink, PromptSending } from "./use-prompt-sending.js";
import { usePromptSlash } from "./use-prompt-slash.js";
import type { PromptSlash } from "./use-prompt-slash.js";

interface PromptView {
  readonly input: PromptInput;
  readonly sending: PromptSending;
  readonly slash: PromptSlash;
}

const usePromptView = (
  props: PromptBoxProps,
  base: PromptBase,
  prefill: PromptLink
): PromptView => {
  const slash = usePromptSlash(props, base);
  const input = usePromptInput(props, base, slash.slash);
  const sending = usePromptSending(props, base, input, prefill);

  return { input, sending, slash };
};

export { usePromptView };

export type { PromptView };
