import type { Dispatch, ReactElement, SetStateAction } from "react";

import { ExpandPromptButton } from "./expand-prompt-button.js";
import { useExpandPrompt } from "./use-expand-prompt.js";

interface ExpandPromptSlotProps {
  readonly draft: {
    readonly prompt: string;
    readonly setPrompt: Dispatch<SetStateAction<string>>;
  };
}

const ExpandPromptSlot = ({ draft }: ExpandPromptSlotProps): ReactElement => {
  const expand = useExpandPrompt({
    prompt: draft.prompt,
    setPrompt: draft.setPrompt,
  });

  return (
    <ExpandPromptButton expand={expand} isEmpty={draft.prompt.trim() === ""} />
  );
};

export { ExpandPromptSlot };
