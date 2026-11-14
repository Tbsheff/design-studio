import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { ROTATE_CORNERS } from "./rotate-drag-model.js";

const RotateZones = ({
  down,
}: {
  readonly down: (event: ReactPointerEvent<HTMLElement>) => void;
}): ReactElement => (
  <>
    {ROTATE_CORNERS.map((corner) => (
      <div
        key={corner}
        className={`rotate-zone ${corner}`}
        data-testid={`rotate-zone-${corner}`}
        aria-hidden="true"
        onPointerDown={down}
      />
    ))}
  </>
);

export { RotateZones };
