import { createElement, useCallback } from "react";
import type { ReactElement } from "react";

import { useFrameFocusFiles } from "../../features/canvas/index";
import { RunCommentsContext } from "../../features/chat/run-comments";
import { LeftPane } from "../shell/left-pane";
import { StudioPaneHeader } from "../shell/studio-pane-header";
import {
  chatProps,
  detailsProps,
  errorsProps,
  headerProps,
  promptProps,
} from "./left-props";
import { commentsProps } from "./left-props-panels";
import type { StudioCtxProps } from "./studio-context";

const StudioLeft = ({ ctx }: StudioCtxProps): ReactElement => {
  const { ui, panes, core } = ctx;

  const frameFocus = useFrameFocusFiles(
    ctx.projectId,
    Boolean(ctx.project.app)
  );

  const { showComments } = panes;
  const header = createElement(StudioPaneHeader, headerProps(ctx));

  const handleShowComments = useCallback((): void => {
    void showComments(true);
  }, [showComments]);

  return (
    <RunCommentsContext.Provider value={core.comments}>
      <LeftPane
        columnsRef={ui.columnsRef}
        header={header}
        chat={chatProps(ctx)}
        errors={errorsProps(ctx)}
        prompt={promptProps(ctx, frameFocus)}
        details={detailsProps(ctx)}
        comments={commentsProps(ctx)}
        onShowComments={handleShowComments}
        todos={core.chatState.todos}
      />
    </RunCommentsContext.Provider>
  );
};

export { StudioLeft };
