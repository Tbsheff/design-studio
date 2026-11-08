import type { PromptBoxProps } from "./prompt-box-props.js";
import type { PromptBase } from "./use-prompt-base.js";
import type { PromptInput } from "./use-prompt-input.js";
import type { PromptSending } from "./use-prompt-sending.js";
import type { PromptSlash } from "./use-prompt-slash.js";

interface PromptParts {
  readonly base: PromptBase;
  readonly box: PromptBoxProps;
  readonly input: PromptInput;
  readonly sending: PromptSending;
  readonly slash: PromptSlash;
}

export type { PromptParts };
