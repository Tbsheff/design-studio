import type { ReactElement } from "react";
import { useCallback } from "react";

import { SPECS } from "./comment-action-model.js";
import type {
  ActionControl,
  CommentActionKind,
} from "./comment-action-model.js";
import { Icon } from "./deps.js";
import type { DesignComment } from "./deps.js";
import { fire } from "./fire.js";

const CommentAction = ({
  comment,
  control,
  index,
  kind,
  onPress,
  total,
}: {
  comment: DesignComment;
  control: ActionControl;
  index: number;
  kind: CommentActionKind;
  onPress: (() => void) | null;
  total: number;
}): ReactElement => {
  const spec = SPECS[kind];

  const press = useCallback((): void => {
    if (onPress) {
      onPress();

      return;
    }

    fire(() => spec.run({ comment, control, index, total }));
  }, [comment, control, index, onPress, spec, total]);

  return (
    <button
      type="button"
      className={spec.className}
      aria-label={spec.name(comment)}
      data-tip={spec.tip}
      data-testid={spec.testId}
      disabled={spec.isDisabled({ comment, control, index, total })}
      onClick={press}
    >
      <Icon name={spec.icon} size={spec.iconSize} />
      {spec.label}
    </button>
  );
};

export { CommentAction };
