import { useEffect, useRef } from "react";

import {
  RULER_SIZE,
  type Props,
  viewOf,
  colorsOf,
  sizeCanvas,
  drawAxis,
} from "./ruler-draw.js";

export default function CanvasRulers({
  artboardRef,
  origin,
  selection,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);
  const props = useRef({ origin, selection });
  props.current = { origin, selection };
  const draw = useRef<() => void>(() => undefined);
  draw.current = () => {
    const view = viewOf(artboardRef.current);
    const el = root.current;

    if (!view || !el || !top.current || !left.current) {
      return;
    }

    const colors = colorsOf(el);
    const { origin: o, selection: s } = props.current;
    const font = `500 9px ${getComputedStyle(el).fontFamily}`;

    const run = (canvas: HTMLCanvasElement, vertical: boolean) => {
      const ctx = sizeCanvas(canvas);

      if (!ctx) {
        return;
      }

      ctx.font = font;

      const range: [number, number] | null = s
        ? vertical
          ? [o.y + s.y, o.y + s.y + s.height]
          : [o.x + s.x, o.x + s.x + s.width]
        : null;

      const length = vertical ? canvas.clientHeight : canvas.clientWidth;
      drawAxis({
        ctx,
        length,
        offset: (vertical ? view.y : view.x) - RULER_SIZE,
        zoom: view.zoom,
        origin: vertical ? o.y : o.x,
        vertical,
        colors,
        range,
      });
    };

    run(top.current, false);
    run(left.current, true);
  };

  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = 0;
        draw.current();
      });
    };

    const board = artboardRef.current;
    const mo = new MutationObserver(schedule);

    if (board) {
      mo.observe(board, { attributes: true, attributeFilter: ["style"] });
    }

    const ro = new ResizeObserver(schedule);

    if (root.current) {
      ro.observe(root.current);
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", schedule);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      ro.disconnect();
      theme.disconnect();
      media.removeEventListener("change", schedule);
    };
  }, [artboardRef]);

  useEffect(
    () => draw.current(),
    [
      origin.x,
      origin.y,
      selection?.x,
      selection?.y,
      selection?.width,
      selection?.height,
    ]
  );

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
}
