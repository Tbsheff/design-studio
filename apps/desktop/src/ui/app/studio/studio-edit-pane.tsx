import { Suspense, createElement } from "react";
import type { ReactElement } from "react";

import { McpEditStrip } from "../../features/chat/index.js";
import { Inspector } from "../../features/inspector/index.js";
import { componentsProps, inspectorProps } from "./left-props-panels";
import type { StudioCtxProps } from "./studio-context";

const StudioEditPane = ({ ctx }: StudioCtxProps): ReactElement => (
  <section className="pane-edit" hidden={ctx.ui.isCommentsShown}>
    <Suspense fallback={null}>
      {createElement(Inspector, {
        ...inspectorProps(ctx),
        components: componentsProps(ctx),
      })}
      <McpEditStrip mcp={ctx.core.mcp ?? null} />
    </Suspense>
  </section>
);

export { StudioEditPane };
