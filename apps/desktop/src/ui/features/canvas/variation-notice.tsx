import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface VariationNoticeProps {
  readonly onDismiss: () => void;
  readonly testId: string | null;
  readonly text: string;
}

const VariationNotice = ({
  onDismiss,
  testId,
  text,
}: VariationNoticeProps): ReactElement => (
  <output className="variations-notice alert inline" data-testid={testId}>
    <span>{text}</span>
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.dismiss}
      onClick={onDismiss}
    >
      <Icon name="close" size={12} />
    </button>
  </output>
);

export { VariationNotice };
