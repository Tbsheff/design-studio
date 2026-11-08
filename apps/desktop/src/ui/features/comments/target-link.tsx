import type { ReactElement } from "react";
import { useCallback } from "react";

import type { DesignComment } from "./deps.js";
import { toTargetLabel, toTargetTip } from "./target-text-model.js";
import type { CommentsControl } from "./use-comments.js";
import { toNotShownText, useShownPaths } from "./use-shown-paths.js";

const toTargetTipText = (
  comment: DesignComment,
  away: string | null
): string => {
  if (away) {
    return `${away}. Set a frame to this page to see the pin.`;
  }

  return toTargetTip(comment);
};

const TargetLink = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement => {
  const away = toNotShownText(comment, useShownPaths());
  const { setOpenId } = control;

  const open = useCallback((): void => {
    setOpenId(comment.id);
  }, [comment.id, setOpenId]);

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Show comment ${comment.n} on the canvas`}
      data-tip={toTargetTipText(comment, away)}
      data-tip-align="start"
    >
      <span className="truncate">{away ?? toTargetLabel(comment)}</span>
    </button>
  );
};

export { TargetLink };
