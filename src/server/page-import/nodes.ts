import type { CapturedNode } from "./captured.js";

const isElement = (child: CapturedNode | string): child is CapturedNode =>
  child instanceof Object;

const elementChildren = (node: CapturedNode): CapturedNode[] =>
  node.children.filter(isElement);

export { elementChildren, isElement };
