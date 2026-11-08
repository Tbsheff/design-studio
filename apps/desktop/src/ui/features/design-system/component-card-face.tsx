import type { ReactElement } from "react";

import { ComponentPreviewThumb } from "./component-preview-thumb.js";
import { ComponentThumb } from "./component-thumb.js";
import type { Item } from "./components-panel-model.js";
import type { Props } from "./components-panel-props.js";

const CardThumb = ({
  item,
  props,
}: {
  item: Item;
  props: Props;
}): ReactElement => {
  const directionId = props.directionId ?? "";

  if (item.insert) {
    return (
      <ComponentPreviewThumb
        projectId={props.projectId}
        directionId={directionId}
        id={item.insert.id}
        version={props.list.version}
        active={props.active}
      />
    );
  }

  return (
    <ComponentThumb
      projectId={props.projectId}
      directionId={directionId}
      component={item.info}
      version={props.list.version}
      active={props.active}
    />
  );
};

export { CardThumb };
