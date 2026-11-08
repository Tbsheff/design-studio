import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import type {
  InsertPosition,
  InsertTarget,
} from "@design-studio/contracts/insert";
import type { MutableRefObject } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";
import type { MenuAnchor } from "./components-panel-props.js";

interface Frames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  post: (body: ParentMessageBody) => void;
}

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  enabled: boolean;
  frames: Frames;
  selection: SelectionContext[];
  notify: (message: string) => void;
}

const newSelector = (selector: string, position: InsertPosition): string => {
  if (position === "inside") {
    return `${selector} > :last-child`;
  }

  return `${selector} + *`;
};

const targetOf = (selection: SelectionContext): InsertTarget | null => {
  if (!selection.source && !selection.owners?.length) {
    return null;
  }

  if (selection.usedAt && selection.usedBy?.root) {
    return {
      selector: selection.selector,
      source: selection.usedAt,
      tag: selection.usedBy.name.toLowerCase(),
    };
  }

  const target: InsertTarget = {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };

  if (selection.owners?.length) {
    target.owners = selection.owners;
  }

  return target;
};

const frameRect = (
  frames: Frames
): { el: HTMLIFrameElement; rect: DOMRect } | null => {
  if (!frames.frontToken) {
    return null;
  }

  const el = frames.elements.current[frames.frontToken];

  if (el) {
    return { el, rect: el.getBoundingClientRect() };
  }

  return null;
};

const isInside = (rect: DOMRect, posX: number, posY: number): boolean => {
  if (rect.width === 0) {
    return false;
  }

  const isAcross = posX >= rect.left && posX <= rect.right;

  return isAcross && posY >= rect.top && posY <= rect.bottom;
};

const localPoint = (
  frames: Frames,
  posX: number,
  posY: number
): MenuAnchor | null => {
  const found = frameRect(frames);

  if (!found) {
    return null;
  }

  const { el, rect } = found;

  if (!isInside(rect, posX, posY)) {
    return null;
  }

  const scale = rect.width / (el.offsetWidth || rect.width);

  return { x: (posX - rect.left) / scale, y: (posY - rect.top) / scale };
};

export { localPoint, newSelector, targetOf };

export type { Frames, Options };
