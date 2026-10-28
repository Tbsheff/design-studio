import { LAYER_LABEL_MAX, LAYER_TREE_MAX, SOURCE_LOC_ATTR, type LayerNode, type SelectMove } from '../shared/contracts.js';
import { layerKey, layerRef } from '../shared/layer-ref.js';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'BASE', 'TITLE']);
const TEXT_MAX = 40;

function clip(value: string, max: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function isLayer(element: Element): boolean {
  return !SKIP_TAGS.has(element.tagName) && !element.id.startsWith('studio-');
}

function layerChildren(element: Element): Element[] {
  return Array.from(element.children).filter(isLayer);
}

function nameOf(element: Element): string {
  const dataName = element.getAttribute('data-name');
  if (dataName) return clip(dataName, LAYER_LABEL_MAX);
  if (element.id) return clip(`#${element.id}`, LAYER_LABEL_MAX);
  const firstClass = (element.getAttribute('class') ?? '').trim().split(/\s+/)[0];
  return firstClass ? clip(`.${firstClass}`, LAYER_LABEL_MAX) : '';
}

function textOf(element: Element): string {
  if (Array.from(element.childNodes).some((node) => node.nodeType === Node.ELEMENT_NODE)) return '';
  return clip(element.textContent ?? '', TEXT_MAX);
}

function locOf(element: Element, refs: Map<Element, string>): { loc?: string; ref?: string } {
  const loc = element.getAttribute(SOURCE_LOC_ATTR);
  const ref = refs.get(element);
  return loc ? { loc, ...(ref ? { ref } : {}) } : {};
}

function sourceRefs(): Map<Element, string> {
  const refs = new Map<Element, string>();
  const counts = new Map<string, number>();
  for (const element of document.body.querySelectorAll(`[${SOURCE_LOC_ATTR}]`)) {
    const loc = element.getAttribute(SOURCE_LOC_ATTR) as string;
    const nth = counts.get(loc) ?? 0;
    counts.set(loc, nth + 1);
    refs.set(element, layerRef(layerKey(loc, null, nth)));
  }
  return refs;
}

export interface LayerIndex {
  build(locked?: (element: Element) => boolean): { nodes: LayerNode[]; truncated: boolean };
  idOf(element: Element): number;
  element(id: number): Element | null;
}

export function createLayerIndex(): LayerIndex {
  const ids = new WeakMap<Element, number>();
  let byId = new Map<number, Element>();
  let next = 1;

  const idOf = (element: Element): number => {
    let id = ids.get(element);
    if (id === undefined) {
      id = next;
      next += 1;
      ids.set(element, id);
    }
    byId.set(id, element);
    return id;
  };

  const build = (locked?: (element: Element) => boolean): { nodes: LayerNode[]; truncated: boolean } => {
    byId = new Map();
    const refs = sourceRefs();
    const nodes: LayerNode[] = [];
    const stack: { element: Element; depth: number }[] = layerChildren(document.body)
      .reverse()
      .map((element) => ({ element, depth: 0 }));
    while (stack.length > 0 && nodes.length < LAYER_TREE_MAX) {
      const { element, depth } = stack.pop() as { element: Element; depth: number };
      const children = layerChildren(element);
      nodes.push({
        id: idOf(element),
        depth,
        tag: element.tagName.toLowerCase(),
        name: nameOf(element),
        text: textOf(element),
        childCount: children.length,
        hidden: element.getClientRects().length === 0,
        ...locOf(element, refs),
        ...(locked?.(element) ? { locked: true } : {}),
      });
      for (let i = children.length - 1; i >= 0; i -= 1) stack.push({ element: children[i] as Element, depth: depth + 1 });
    }
    return { nodes, truncated: stack.length > 0 };
  };

  const element = (id: number): Element | null => {
    const found = byId.get(id) ?? null;
    return found?.isConnected ? found : null;
  };

  return { build, idOf, element };
}

function sibling(element: Element, forward: boolean): Element | null {
  let current = forward ? element.nextElementSibling : element.previousElementSibling;
  while (current && !isLayer(current)) current = forward ? current.nextElementSibling : current.previousElementSibling;
  return current;
}

export function moveSelection(element: Element, move: SelectMove): Element | null {
  if (move === 'child') return layerChildren(element)[0] ?? null;
  if (move === 'parent') {
    const parent = element.parentElement;
    return parent && parent !== document.body && parent !== document.documentElement ? parent : null;
  }
  return sibling(element, move === 'next');
}
