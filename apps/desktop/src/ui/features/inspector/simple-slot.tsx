import { memo } from "react";
import type { ReactElement } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { sameShared } from "./same-props.js";
import { SimpleTab } from "./simple-tab.js";

const SimpleTabMemo = memo(SimpleTab, sameShared);

interface Props {
  readonly props: InspectorProps;
}

const SimpleSlot = ({ props }: Props): ReactElement => (
  <SimpleTabMemo
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

export { SimpleSlot };
