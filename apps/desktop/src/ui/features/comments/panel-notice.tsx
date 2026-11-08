import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const PanelNotice = ({
  control,
}: {
  control: CommentsControl;
}): ReactElement | null => {
  const { clearNotice } = control;

  const dismiss = useCallback((): void => {
    clearNotice();
  }, [clearNotice]);

  if (!control.notice) {
    return null;
  }

  return (
    <output className="comments-notice">
      <span>{control.notice}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismissNotice}
        onClick={dismiss}
      >
        <Icon name="close" />
      </button>
    </output>
  );
};

export { PanelNotice };
