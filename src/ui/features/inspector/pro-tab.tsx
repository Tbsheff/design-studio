import { copy } from "./copy.js";
import { EMPTY_HINT, type InspectorProps } from "./inspector-model.js";

const ProTab = (props: InspectorProps) => {
  return (
    <div className="edit-pro">
      <div className="edit-pro-layers">
        {props.layers ?? <p className="ins-hint">{copy.layersHint}</p>}
      </div>
      {props.selection.length === 0 && <p className="ins-hint">{EMPTY_HINT}</p>}
    </div>
  );
};

export { ProTab };
