import { createElement } from "react";
import type { ReactElement } from "react";

import { LeftPane } from "../../components/LeftPane";
import { RunCommentsContext } from "../../components/RunComments";
import { StudioPaneHeader } from "../../components/StudioPaneHeader";
import {
  chatProps,
  detailsProps,
  errorsProps,
  headerProps,
  promptProps,
  tweaksProps,
} from "./left-props";
import {
  commentsProps,
  componentsProps,
  inspectorProps,
  versionsProps,
} from "./left-props-panels";
import type { StudioCtxProps } from "./studio-context";
import { StudioSystem } from "./studio-system";

const StudioLeft = ({ ctx }: StudioCtxProps): ReactElement => {
  const { ui, panes, core } = ctx;
  const handleTab = panes.showPane;
  const header = createElement(StudioPaneHeader, headerProps(ctx));
  const system = createElement(StudioSystem, { ctx });

  return (
    <RunCommentsContext.Provider value={core.comments}>
      <LeftPane
        collapsed={ui.paneCollapsed}
        columnsRef={ui.columnsRef}
        tab={panes.panel.tab}
        onTab={handleTab}
        header={header}
        system={system}
        chat={chatProps(ctx)}
        errors={errorsProps(ctx)}
        prompt={promptProps(ctx)}
        inspector={inspectorProps(ctx)}
        details={detailsProps(ctx)}
        comments={commentsProps(ctx)}
        tokens={core.studioTokens.panel}
        components={componentsProps(ctx)}
        todos={core.chatState.todos}
        tweaks={tweaksProps(ctx)}
        versions={versionsProps(ctx)}
      />
    </RunCommentsContext.Provider>
  );
};

export { StudioLeft };
