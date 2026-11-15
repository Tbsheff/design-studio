import { useCallback } from "react";
import type { ReactElement } from "react";

import { requestCanvasTool } from "../../platform/canvas-tool.js";
import { copy } from "./copy.js";
import { toInspectorEmptyReason } from "./inspector-model.js";
import type { InspectorProps } from "./inspector-model.js";
import { ScrollPinSection } from "./scroll-pin-section.js";
import { toSelectionKey } from "./simple-tab-model.js";

const isScrollPinShown = (props: InspectorProps): boolean =>
  props.directionId !== null &&
  toInspectorEmptyReason(props.selection, props.isEditable) === null;

const PrototypeTab = ({
  props,
}: {
  readonly props: InspectorProps;
}): ReactElement => {
  const pickLinkTool = useCallback(() => requestCanvasTool("prototype"), []);

  return (
    <div className="edit-prototype">
      {isScrollPinShown(props) && (
        <ScrollPinSection key={toSelectionKey(props.selection)} props={props} />
      )}
      <p className="ins-hint">{copy.prototypeHint}</p>
      <button type="button" className="btn small" onClick={pickLinkTool}>
        {copy.prototypeUseTool}
      </button>
    </div>
  );
};

export { PrototypeTab };
