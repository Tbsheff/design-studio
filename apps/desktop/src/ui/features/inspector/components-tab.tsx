import type { ReactElement } from "react";

import { ComponentsPanel } from "../../app/components-panel-host.js";
import { copy } from "./copy.js";
import type { InspectorProps } from "./inspector-model.js";

const ComponentsTab = ({
  components,
}: {
  readonly components: InspectorProps["components"];
}): ReactElement => {
  if (!components) {
    return <p className="ins-hint edit-tab-empty">{copy.componentsHint}</p>;
  }

  return (
    <div className="edit-components">
      <ComponentsPanel
        projectId={components.projectId}
        directionId={components.directionId}
        list={components.list}
        active
        onMention={components.onMention}
        kind={components.kind}
        selection={components.selection}
      />
    </div>
  );
};

export { ComponentsTab };
