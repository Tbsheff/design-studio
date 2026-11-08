import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

const ReplyCopy = ({ getText }: { getText: () => string }): ReactElement => (
  <span className="reply-copy-slot">
    <CopyButton getText={getText} label="Copy reply" />
  </span>
);

export { ReplyCopy };
