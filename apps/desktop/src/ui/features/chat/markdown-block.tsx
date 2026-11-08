import { memo } from "react";
import type { ReactElement } from "react";

import { Markdown } from "../../ai/components/ai/markdown.js";

const MarkdownBlockBody = ({ text }: { text: string }): ReactElement => (
  <Markdown>{text}</Markdown>
);

const MarkdownBlock = memo(MarkdownBlockBody);

MarkdownBlock.displayName = "MarkdownBlock";

export { MarkdownBlock };
