import type { ReactElement } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { ProTab } from "./pro-tab.js";

interface Props {
  readonly props: InspectorProps;
}

const ProSlot = ({ props }: Props): ReactElement => (
  <ProTab
    projectId={props.projectId}
    directionId={props.directionId}
    selection={props.selection}
    isEditable={props.isEditable}
    port={props.port}
    control={props.control}
    onCommitted={props.onCommitted}
    notice={props.notice}
    onStale={props.onStale}
    tokens={props.tokens}
    session={props.session}
    onExit={props.onExit}
    onSessionEnd={props.onSessionEnd}
    layers={props.layers}
    tweaks={props.tweaks}
    isSelectMode={props.isSelectMode}
    onSelectMode={props.onSelectMode}
    onUndo={props.onUndo}
    onRedo={props.onRedo}
    tab={props.tab}
    onTab={props.onTab}
    appDir={props.appDir}
    onAskAgent={props.onAskAgent}
    components={props.components}
  />
);

export { ProSlot };
