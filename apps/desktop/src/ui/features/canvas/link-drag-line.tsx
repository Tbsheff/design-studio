import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import type { LinkDrag } from "./prototype-model.js";

const DOT_RADIUS = 4;

const LinkDragLine = ({
  drag,
}: {
  drag: LinkDrag | null;
}): ReactElement | null => {
  const body = useDocumentBody();

  if (!drag || !body) {
    return null;
  }

  const line = (
    <svg className="link-drag-line" aria-hidden="true">
      <line x1={drag.from.x} y1={drag.from.y} x2={drag.to.x} y2={drag.to.y} />
      <circle cx={drag.to.x} cy={drag.to.y} r={DOT_RADIUS} />
    </svg>
  );

  return <>{createPortal(line, body)}</>;
};

export { LinkDragLine };
