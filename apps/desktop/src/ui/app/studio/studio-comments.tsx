import { Suspense, createElement, useCallback } from "react";
import type { ReactElement } from "react";

import { CommentsPanel } from "../../features/comments/index.js";
import { SheetFrame } from "../shell/sheet-frame";
import { COLUMN_COPY } from "./copy";
import { commentsProps } from "./left-props-panels";
import type { StudioCtxProps } from "./studio-context";

const StudioComments = ({ ctx }: StudioCtxProps): ReactElement => {
  const { showComments } = ctx.panes;

  const handleClose = useCallback((): void => {
    void showComments(false);
  }, [showComments]);

  return (
    <SheetFrame
      closeLabel={COLUMN_COPY.backToChat}
      closeTip={COLUMN_COPY.backToChat}
      onClose={handleClose}
      tab="comments"
      title={COLUMN_COPY.comments}
    >
      <Suspense fallback={null}>
        {createElement(CommentsPanel, commentsProps(ctx))}
      </Suspense>
    </SheetFrame>
  );
};

export { StudioComments };
