import type { ReactElement } from "react";

import { CommentReplies } from "./comment-replies.js";
import { PopoverBody } from "./popover-body.js";
import { PopoverFoot } from "./popover-foot.js";
import { PopoverHead } from "./popover-head.js";
import type { OpenProps } from "./popover-props.js";
import { ReplyBox } from "./reply-box.js";

const PopoverContent = ({
  changed,
  isEditable,
  onChange,
  onEnter,
  onSave,
  popover,
  text,
}: {
  changed: boolean;
  isEditable: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  onSave: () => void;
  popover: OpenProps;
  text: string;
}): ReactElement => {
  const { comment, onClose, onDelete, onDeleteReply, onFix, onReopen } =
    popover;

  const { onReply, onResolve, onSend } = popover;

  return (
    <>
      <PopoverHead
        comment={comment}
        onClose={onClose}
        onDelete={onDelete}
        onFix={onFix}
        onReopen={onReopen}
        onResolve={onResolve}
      />
      {popover.breadcrumb && (
        <p
          className="comment-card-crumb"
          data-tip={popover.breadcrumb.full}
          data-tip-align="start"
        >
          {popover.breadcrumb.short}
        </p>
      )}
      <PopoverBody
        comment={comment}
        isEditable={isEditable}
        onChange={onChange}
        onEnter={onEnter}
        text={text}
      />
      <CommentReplies comment={comment} onDelete={onDeleteReply} />
      <ReplyBox comment={comment} onReply={onReply} />
      {isEditable && (
        <PopoverFoot
          busy={popover.busy}
          changed={changed}
          onSave={onSave}
          onSend={onSend}
        />
      )}
    </>
  );
};

export { PopoverContent };
