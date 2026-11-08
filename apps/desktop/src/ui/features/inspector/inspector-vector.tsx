import type { ReactElement } from "react";

import { isSvgDrawingTag } from "../../../shared/vector.js";
import { VectorBooleanRow } from "./vector-boolean-row.js";
import { toOnlySelection } from "./vector-model.js";
import type { VectorProps } from "./vector-model.js";
import { PaintRows } from "./vector-paint-rows.js";

const MAX_SELECTION = 2;

const InspectorVector = (props: VectorProps): ReactElement | null => {
  if (
    !props.directionId ||
    props.selection.length > MAX_SELECTION ||
    !props.selection.every((item) => isSvgDrawingTag(item.tag) && item.source)
  ) {
    return null;
  }

  const only = toOnlySelection(props.selection);

  if (only) {
    return (
      <div className="vector-inspector">
        <PaintRows
          key={`${only.selector}|${only.outerHTML.length}`}
          props={props}
          target={only}
        />
      </div>
    );
  }

  return (
    <div className="vector-inspector">
      <VectorBooleanRow props={props} />
    </div>
  );
};

export { InspectorVector };
