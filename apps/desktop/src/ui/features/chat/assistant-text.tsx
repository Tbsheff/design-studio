import { memo } from "react";
import type { ReactElement } from "react";

import { MessageText } from "../../ai/components/ai/message-text.js";
import { splitMarkdownBlocks } from "../../domain/markdown-blocks.js";
import { MarkdownBlock } from "./markdown-block.js";
import { toStyled } from "./styled.js";

const AssistantBody = toStyled(
  MessageText,
  "msg-body assistant-text wrap-anywhere"
);

interface AssistantTextProps {
  readonly text: string;
  readonly streaming?: boolean;
}

const toKeyedBlocks = (
  text: string
): readonly { readonly id: string; readonly block: string }[] =>
  splitMarkdownBlocks(text).map((block, position) => ({
    block,
    id: `block-${position}`,
  }));

const AssistantTextBody = ({
  text,
  streaming = false,
}: AssistantTextProps): ReactElement => (
  <AssistantBody data-streaming={streaming || null}>
    {toKeyedBlocks(text).map((entry) => (
      <MarkdownBlock key={entry.id} text={entry.block} />
    ))}
  </AssistantBody>
);

const AssistantText = memo(AssistantTextBody);

AssistantText.displayName = "AssistantText";

export { AssistantText };
