import type { ReactElement } from "react";

import { CommentAction } from "./comment-action.js";
import type { DesignComment } from "./deps.js";
import { RepinButton } from "./repin-button.js";
import { toTargetLabel, toTargetTip } from "./target-text-model.js";
import type { CommentsControl } from "./use-comments.js";
import { toNotShownText, useShownPaths } from "./use-shown-paths.js";

const OrphanRowFoot = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement => {
  const away = toNotShownText(comment, useShownPaths());

  return (
    <div className="comment-row-foot">
      <span
        className="comment-row-meta clip"
        data-tip={toTargetTip(comment)}
        data-tip-align="start"
      >
        {away ?? `Element not found: ${toTargetLabel(comment)}`}
      </span>
      <div className="comment-row-actions">
        <CommentAction
          kind="fix"
          comment={comment}
          control={control}
          index={0}
          total={1}
          onPress={null}
        />
        <RepinButton comment={comment} control={control} />
        <CommentAction
          kind="delete"
          comment={comment}
          control={control}
          index={0}
          total={1}
          onPress={null}
        />
      </div>
    </div>
  );
};

export { OrphanRowFoot };
