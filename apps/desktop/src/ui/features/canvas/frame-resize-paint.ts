import type { Size } from "./frame-resize-model.js";

interface SideStyle {
  readonly width: string;
  readonly height: string;
}

const toSide = (side: number | null, fallback: string): string => {
  if (side === null) {
    return fallback;
  }

  return `${side}px`;
};

const paintIframe = (frame: HTMLIFrameElement, size: Size | null): void => {
  frame.style.width = toSide(size?.width ?? null, "");
  frame.style.height = toSide(size?.height ?? null, "");
};

const paintReadout = (element: Element, size: Size | null): void => {
  element.textContent = "";

  if (size) {
    element.textContent = `${size.width} × ${size.height}`;
  }
};

const paintChild = (child: Element, size: Size | null): void => {
  if (child instanceof HTMLIFrameElement) {
    paintIframe(child, size);

    return;
  }

  if (child.classList.contains("frame-size-readout")) {
    paintReadout(child, size);
  }
};

const paintChildren = (host: HTMLElement, size: Size | null): void => {
  for (const child of host.children) {
    paintChild(child, size);
  }
};

const paintSize = (
  host: HTMLElement,
  size: Size | null,
  restore: SideStyle
): void => {
  host.style.width = toSide(size?.width ?? null, restore.width);
  host.style.height = toSide(size?.height ?? null, restore.height);
  paintChildren(host, size);
  host.classList.toggle("frame-resizing", size !== null);
};

export { paintSize };

export type { SideStyle };
