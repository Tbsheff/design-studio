import { memo } from "react";
import type { ReactElement } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { InspectorTools } from "./inspector-tools.js";
import { isSameShared } from "./same-props-model.js";

const ToolsMemo = memo(InspectorTools, isSameShared);

interface Props {
  readonly props: InspectorProps;
}

const ToolsSlot = ({ props }: Props): ReactElement => (
  <ToolsMemo
    projectId={props.projectId}
    directionId={props.directionId}
    selection={props.selection}
    port={props.port}
    control={props.control}
    isSelectMode={props.isSelectMode}
    onSelectMode={props.onSelectMode}
    onUndo={props.onUndo}
    onRedo={props.onRedo}
  />
);

export { ToolsSlot };
