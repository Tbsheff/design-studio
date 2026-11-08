import { useMemo } from "react";

import type { ActiveFrame } from "./comment-anchors.js";
import { onActiveFrame } from "./comment-anchors.js";
import { toActiveFrame, toActiveKey } from "./comment-layer-model.js";
import { hasPin } from "./deps.js";
import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const isShownStatus = (
  comment: DesignComment,
  showResolved: boolean
): boolean =>
  hasPin(comment.status) ||
  comment.status === "orphaned" ||
  (showResolved && comment.status === "resolved");

const useShownComments = (
  control: CommentsControl,
  active: ActiveFrame | null
): DesignComment[] => {
  const { comments, showResolved } = control;
  const activeKey = toActiveKey(active);

  return useMemo(() => {
    const frame = toActiveFrame(activeKey);

    return comments.filter(
      (comment) =>
        isShownStatus(comment, showResolved) &&
        (!frame || onActiveFrame(comment, frame))
    );
  }, [comments, showResolved, activeKey]);
};

export { useShownComments };
