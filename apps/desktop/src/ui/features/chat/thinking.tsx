import { memo } from "react";
import type { ReactElement } from "react";

import { ReasoningContent } from "../../ai/components/ai/reasoning-content.js";
import { ReasoningTrigger } from "../../ai/components/ai/reasoning-trigger.js";
import { Reasoning } from "../../ai/components/ai/reasoning.js";
import { toStyled } from "./styled.js";

const ThinkingRoot = toStyled(Reasoning, "thinking");
const ThinkingTrigger = toStyled(ReasoningTrigger, "text-xs");

const toThinkingLabel = (live: boolean): string => {
  if (live) {
    return "Thinking…";
  }

  return "Thought";
};

const ThinkingBody = ({
  text,
  live,
}: {
  text: string;
  live: boolean;
}): ReactElement | null => {
  if (!text && !live) {
    return null;
  }

  return (
    <ThinkingRoot data-testid="thinking">
      <ThinkingTrigger>{toThinkingLabel(live)}</ThinkingTrigger>
      <ReasoningContent>
        <p className="thinking-text whitespace-pre-wrap text-xs">{text}</p>
      </ReasoningContent>
    </ThinkingRoot>
  );
};

const Thinking = memo(ThinkingBody);

Thinking.displayName = "Thinking";

export { Thinking };
