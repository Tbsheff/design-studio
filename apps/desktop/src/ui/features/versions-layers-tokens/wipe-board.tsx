import { useMemo } from "react";
import type { ReactNode } from "react";

import { toBoardClass } from "./compare-wipe-model.js";
import type { WipeApi } from "./use-wipe.js";

interface WipeBoardProps {
  readonly children: ReactNode;
  readonly height: number;
  readonly testId: string;
  readonly width: number;
  readonly wipe: WipeApi;
}

const WipeBoard = ({
  children,
  height,
  testId,
  width,
  wipe,
}: WipeBoardProps): ReactNode => {
  const style = useMemo(() => ({ height, width }), [height, width]);

  const { board, onPointerCancel, onPointerDown, onPointerMove, onPointerUp } =
    wipe;

  return (
    <div
      ref={board}
      className={toBoardClass(wipe.dragging)}
      data-testid={testId}
      style={style}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
    </div>
  );
};

export { WipeBoard };
