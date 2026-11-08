import { createElement } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EmptyState } from "./empty-state.js";
import { ImageSection } from "./image-section.js";
import type { InspectorProps } from "./inspector-model.js";

const SimpleImageOutside = ({
  inspector,
}: {
  readonly inspector: InspectorProps;
}): ReactElement => (
  <div className="inspector ins-simple">
    <div className="ins-scroll">
      {createElement(ImageSection, inspector)}
      <EmptyState reason={copy.imageOutside} notice={inspector.notice} />
    </div>
  </div>
);

export { SimpleImageOutside };
