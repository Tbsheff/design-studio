import type { ReactElement } from "react";
import { useEffect, useRef } from "react";

import {
  RULER_SIZE,
  viewOf,
  colorsOf,
  sizeCanvas,
  drawAxis,
} from "./ruler-draw.js";
import type { Props } from "./ruler-draw.js";

export default function CanvasRulers({
  artboardRef,
  origin,
  selection,
}: Props): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);
  const props = useRef({ origin, selection });
  props.current = { origin, selection };
  const draw = useRef<() => void>(() => null);
  draw.current = (): void => {
    const view = viewOf(artboardRef.current);
    const el = root.current;

    if (!view || !el || !top.current || !left.current) {
      return;
    }

    const colors = colorsOf(el);
    const { origin: options, selection: text } = props.current;
    const font = `500 9px ${getComputedStyle(el).fontFamily}`;

    const run = (canvas: HTMLCanvasElement, vertical: boolean): void => {
      const ctx = sizeCanvas(canvas);

      if (!ctx) {
        return;
      }

      ctx.font = font;

      const range: [number, number] | null = text
        ? vertical
          ? [options.y + text.y, options.y + text.y + text.height]
          : [options.x + text.x, options.x + text.x + text.width]
        : null;

      const length = vertical ? canvas.clientHeight : canvas.clientWidth;
      drawAxis({
        colors,
        ctx,
        length,
        offset: (vertical ? view.y : view.x) - RULER_SIZE,
        origin: vertical ? options.y : options.x,
        range,
        vertical,
        zoom: view.zoom,
      });
    };

    run(top.current, false);
    run(left.current, true);
  };

  useEffect(() => {
    let frame = 0;

    const schedule = (): void => {
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
      mo.observe(board, { attributeFilter: ["style"], attributes: true });
    }

    const ro = new ResizeObserver(schedule);

    if (root.current) {
      ro.observe(root.current);
    }

    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", schedule);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme", "style"],
      attributes: true,
    });
    schedule();

    return (): void => {
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
