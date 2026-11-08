import type { ReactElement } from "react";

import { getSourceName, toImageTitle } from "./image-model.js";
import type { Props } from "./image-model.js";
import { ImageRows } from "./image-rows.js";
import { InspectorSection } from "./inspector-fields.js";
import { useImageControls } from "./use-image-controls.js";

const toNameLabel = (
  placed: string | null,
  props: Props,
  isBackground: boolean
): ReactElement => (
  <span className="img-name">
    {placed ?? getSourceName(props.selection, isBackground)}
  </span>
);

const InspectorImage = (props: Props): ReactElement | null => {
  const controls = useImageControls(props);

  if (!controls.kind) {
    return null;
  }

  return (
    <InspectorSection
      title={toImageTitle(controls.isBackground)}
      label={toNameLabel(controls.placed, props, controls.isBackground)}
    >
      <ImageRows controls={controls} props={props} />
    </InspectorSection>
  );
};

export { InspectorImage };
