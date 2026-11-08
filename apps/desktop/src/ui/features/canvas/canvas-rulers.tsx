import { useEffect, useEffectEvent, useRef } from "react";
import type { ReactElement } from "react";

import { observeRulerChanges } from "../../platform/stage-dom.js";
import type { Props } from "./ruler-draw.js";
import { paintRulers } from "./ruler-paint-model.js";

const CanvasRulers = ({
  artboardRef,
  origin,
  selection,
}: Props): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);

  const draw = useEffectEvent((): void => {
    paintRulers(
      { left: left.current, root: root.current, top: top.current },
      artboardRef.current,
      { origin, selection }
    );
  });

  useEffect(() => {
    paintRulers(
      { left: left.current, root: root.current, top: top.current },
      artboardRef.current,
      { origin, selection }
    );
  }, [artboardRef, origin, selection]);

  useEffect(() => {
    let frame = 0;

    const schedule = (): void => {
      if (frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = 0;
        draw();
      });
    };

    const stop = observeRulerChanges(
      artboardRef.current,
      root.current,
      schedule
    );

    schedule();

    return (): void => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [artboardRef]);

  return (
    <div
      ref={root}
      className="canvas-rulers"
      data-testid="canvas-rulers"
      aria-hidden="true"
    >
      <canvas ref={top} className="canvas-ruler top" />
      <canvas ref={left} className="canvas-ruler left" />
      <div className="canvas-ruler-corner" />
    </div>
  );
};

export { CanvasRulers };
