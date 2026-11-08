import { memo } from "react";
import type { ReactElement } from "react";

import { InspectorArrange } from "./inspector-arrange.js";
import type { InspectorProps } from "./inspector-model.js";
import { isSameShared } from "./same-props-model.js";

interface Props {
  readonly props: InspectorProps;
  readonly shouldShowBar: boolean;
}

const ArrangeMemo = memo(InspectorArrange, isSameShared);

const ArrangeSlot = ({ props, shouldShowBar }: Props): ReactElement => (
  <ArrangeMemo
    projectId={props.projectId}
    directionId={props.directionId}
    selection={props.selection}
    isEditable={props.isEditable}
    port={props.port}
    control={props.control}
    onCommitted={props.onCommitted}
    shouldShowBar={shouldShowBar}
  />
);

export { ArrangeSlot };
