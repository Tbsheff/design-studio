import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useFrameFit } from "./use-frame-fit.js";

const toShownText = (
  notice: string | null,
  isPending: boolean
): string | null => {
  if (isPending) {
    return copy.frameFitBusy;
  }

  return notice;
};

const FrameFitHost = ({
  projectId,
}: {
  readonly projectId: string;
}): ReactElement | null => {
  const { dismiss, isPending, notice } = useFrameFit(projectId);
  const text = toShownText(notice, isPending);

  if (text === null) {
    return null;
  }

  return (
    <output className="edit-notice">
      <span>{text}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        onClick={dismiss}
      >
        <Icon name="close" size={14} />
      </button>
    </output>
  );
};

export { FrameFitHost };
