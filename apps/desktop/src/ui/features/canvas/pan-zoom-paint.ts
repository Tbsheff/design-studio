import { ZOOM_100 } from "./pan-zoom-model.js";
import { toView } from "./pan-zoom-state.js";
import type { PanZoomState } from "./pan-zoom-state.js";

const SCREEN_SIZE_CHROME = [
  "frame-label",
  "frame-resize",
  "frame-size-readout",
  "overlay",
  "link-layer",
];

const setZoomVars = (element: HTMLElement, zoom: number): void => {
  element.style.setProperty("--stroke", `${1 / zoom}px`);
  element.style.setProperty("--inv-zoom", String(1 / zoom));
};

const paintChromeElement = (
  element: HTMLElement,
  className: string,
  zoom: number
): void => {
  if (className !== "frame-label") {
    setZoomVars(element, zoom);

    return;
  }

  element.style.transform = `scale(${1 / zoom})`;
  element.style.maxWidth = `calc(var(--frame-w, 100000px) * ${zoom})`;
};

const paintScreenSizeChrome = (artboard: HTMLElement, zoom: number): void => {
  const walker = document.createTreeWalker(artboard, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const element = walker.currentNode;

    if (element instanceof HTMLElement) {
      const className = SCREEN_SIZE_CHROME.find((name) =>
        element.classList.contains(name)
      );

      if (className) {
        paintChromeElement(element, className, zoom);
      }
    }
  }
};

const paintState = (state: PanZoomState): void => {
  const element = state.artboardRef.current;

  if (!element) {
    return;
  }

  const view = toView(state);
  element.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;

  if (state.painted?.zoom !== view.zoom) {
    paintScreenSizeChrome(element, view.zoom);
  }

  if (
    state.zoomOverride === null &&
    element.style.getPropertyValue("--inv-zoom") !== String(1 / view.zoom)
  ) {
    setZoomVars(element, view.zoom);
  }

  state.painted = view;
  state.zoomPercent.set(Math.round(view.zoom * ZOOM_100));
};

const schedulePaint = (state: PanZoomState): void => {
  if (state.paintFrame) {
    return;
  }

  state.paintFrame = requestAnimationFrame(() => {
    state.paintFrame = 0;
    paintState(state);
  });
};

export { paintState, schedulePaint };
