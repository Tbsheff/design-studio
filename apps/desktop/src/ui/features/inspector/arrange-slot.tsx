import { memo } from "react";
import type { ReactElement } from "react";

import { InspectorArrange } from "./inspector-arrange.js";
import type { InspectorProps } from "./inspector-model.js";
import { sameShared } from "./same-props.js";

interface Props {
  readonly props: InspectorProps;
  readonly shouldShowBar: boolean;
}

const ArrangeMemo = memo(InspectorArrange, sameShared);

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
