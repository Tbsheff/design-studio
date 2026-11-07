import { ComponentsPanel } from "../../app/components-panel-host.js";
import { copy } from "./copy.js";
import type { InspectorProps } from "./inspector-model.js";

const ComponentsTab = ({
  components,
}: {
  readonly components: InspectorProps["components"];
}) => {
  if (!components) {
    return <p className="ins-hint edit-tab-empty">{copy.componentsHint}</p>;
  }

  return (
    <div className="edit-components">
      <ComponentsPanel {...components} active />
    </div>
  );
};

export { ComponentsTab };
