import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

const MessageCopy = ({ text }: { text: string }): ReactElement => (
  <span className="msg-copy-slot">
    <CopyButton text={text} label="Copy message" />
  </span>
);

export { MessageCopy };
