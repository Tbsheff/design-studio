import type { PointerEvent, ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { PinOffset } from "./comment-placement.js";
import { CARD_WIDTH } from "./comment-placement.js";
import type { DesignComment } from "./deps.js";
import { PopoverContent } from "./popover-content.js";
import { PopoverPin } from "./popover-pin.js";
import type { OpenProps } from "./popover-props.js";
import { usePopoverKeys } from "./use-popover-keys.js";
import { usePopoverPlacement } from "./use-popover-placement.js";

const stopPointer = (event: PointerEvent<HTMLDialogElement>): void => {
  event.stopPropagation();
};

const toOffset = (comment: DesignComment): PinOffset | undefined => {
  if (comment.drawing) {
    return;
  }

  return comment.target.offset;
};

const OpenCommentPopover = (props: OpenProps): ReactElement => {
  const { comment, onClose, onSave } = props;
  const [text, setText] = useState(comment.text);
  const root = useRef<HTMLDialogElement>(null);
  const isEditable = comment.status === "queued";
  const changed = text.trim() !== "" && text.trim() !== comment.text;

  const keyDown = usePopoverKeys(root, onClose);

  const placement = usePopoverPlacement(
    {
      anchor: props.anchor,
      frame: props.frame,
      offset: toOffset(comment),
      zoom: props.zoom,
    },
    root
  );

  const scale = 1 / props.zoom;

  const save = useCallback((): void => {
    onSave(text.trim());
  }, [onSave, text]);

  const saveIfChanged = useCallback((): void => {
    if (changed) {
      save();
    }
  }, [changed, save]);

  const cardStyle = useMemo(
    () => ({
      left: placement.card.left,
      top: placement.card.top,
      transform: `scale(${scale})`,
      width: CARD_WIDTH,
    }),
    [placement.card.left, placement.card.top, scale]
  );

  return (
    <>
      <PopoverPin
        comment={comment}
        initial={props.initial}
        pin={placement.pin}
        scale={scale}
      />
      <dialog
        ref={root}
        open
        className="comment-card thread"
        aria-label={`Comment ${comment.n}`}
        data-testid="comment-open"
        data-side={placement.side}
        style={cardStyle}
        onKeyDown={keyDown}
        onPointerDown={stopPointer}
      >
        <PopoverContent
          changed={changed}
          isEditable={isEditable}
          onChange={setText}
          onEnter={saveIfChanged}
          onSave={save}
          popover={props}
          text={text}
        />
      </dialog>
    </>
  );
};

export { OpenCommentPopover };
