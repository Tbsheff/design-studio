import type { ReactElement } from "react";

import { EmptyState } from "./empty-state.js";
import { toInspectorEmptyReason } from "./inspector-model.js";
import type { InspectorProps } from "./inspector-model.js";
import { SimpleImageOutside } from "./simple-image-outside.js";
import { SimpleMultiSelection } from "./simple-multi-selection.js";
import { SimpleSingleSelection } from "./simple-single-selection.js";
import { isImageOutside } from "./simple-tab-model.js";

const SimpleTab = (props: InspectorProps): ReactElement => {
  const reason = toInspectorEmptyReason(props.selection, props.isEditable);
  const [first] = props.selection;
  const target = first ?? null;

  if (isImageOutside(props, reason, target)) {
    return <SimpleImageOutside inspector={props} />;
  }

  if (reason || !target) {
    return <EmptyState reason={reason ?? ""} notice={props.notice} />;
  }

  if (props.selection.length > 1) {
    return <SimpleMultiSelection inspector={props} />;
  }

  return <SimpleSingleSelection inspector={props} />;
};

export { SimpleTab };
