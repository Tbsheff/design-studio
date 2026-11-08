import { createElement } from "react";
import type { ReactElement } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { SimpleMultiEditor } from "./simple-multi-editor.js";
import { toSelectionKey } from "./simple-tab-model.js";
import { VectorSection } from "./vector-section.js";

const SimpleMultiSelection = ({
  inspector,
}: {
  readonly inspector: InspectorProps;
}): ReactElement => {
  const { onCommitted, onStale } = inspector;

  return (
    <SimpleMultiEditor
      key={toSelectionKey(inspector.selection)}
      projectId={inspector.projectId}
      directionId={inspector.directionId}
      selection={inspector.selection}
      port={inspector.port}
      control={inspector.control}
      onCommitted={onCommitted}
      onStale={onStale}
      tokens={inspector.tokens}
      component={createElement(VectorSection, inspector)}
    />
  );
};

export { SimpleMultiSelection };
