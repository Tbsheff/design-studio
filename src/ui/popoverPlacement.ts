import { useLayoutEffect, type CSSProperties, type RefObject } from 'react';

export const POPOVER_GAP = 4;
const MARGIN = 8;

export interface PopoverBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function popoverBounds(anchor: Element): PopoverBounds {
  const bounds = { left: MARGIN, top: MARGIN, right: window.innerWidth - MARGIN, bottom: window.innerHeight - MARGIN };
  const boundary = anchor.closest('[data-popover-boundary]');
  if (boundary) {
    const rect = boundary.getBoundingClientRect();
    bounds.left = Math.max(bounds.left, rect.left + MARGIN);
    bounds.right = Math.min(bounds.right, rect.right - MARGIN);
  }
  return bounds;
}

export interface FixedPlacement {
  align?: 'start' | 'end';
  prefer?: 'above' | 'below';
}

export function placeFixed(trigger: HTMLElement, panel: HTMLElement, { align = 'start', prefer = 'below' }: FixedPlacement = {}): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const bounds = popoverBounds(trigger);
  const room = bounds.right - bounds.left;
  const width = Math.min(panel.offsetWidth, room);
  const height = panel.scrollHeight;
  const above = rect.top - POPOVER_GAP - bounds.top;
  const below = bounds.bottom - rect.bottom - POPOVER_GAP;
  const first = prefer === 'above' ? above : below;
  const second = prefer === 'above' ? below : above;
  const keep = first >= height || first >= second;
  const onTop = prefer === 'above' ? keep : !keep;
  const wanted = align === 'end' ? rect.right - width : rect.left;
  const left = Math.min(Math.max(bounds.left, wanted), bounds.right - width);
  const space = Math.max(0, onTop ? above : below);
  const vertical: CSSProperties = onTop ? { bottom: window.innerHeight - rect.top + POPOVER_GAP } : { top: rect.bottom + POPOVER_GAP };
  return { ...vertical, left, maxWidth: room, maxHeight: space, overflowY: height > space ? 'auto' : undefined };
}

function layoutRect(panel: HTMLElement): { left: number; top: number; right: number } {
  const parent = panel.offsetParent;
  if (!parent) return panel.getBoundingClientRect();
  const base = parent.getBoundingClientRect();
  const left = base.left + panel.offsetLeft;
  return { left, top: base.top + panel.offsetTop, right: left + panel.offsetWidth };
}

function resetFit(style: CSSStyleDeclaration): void {
  for (const key of ['top', 'bottom', 'left', 'right', 'maxHeight', 'maxWidth', 'overflowY'] as const) style[key] = '';
}

function fitVertical(panel: HTMLElement, top: number, from: DOMRect, bounds: PopoverBounds): void {
  const style = panel.style;
  const height = panel.scrollHeight;
  const below = bounds.bottom - top;
  const above = from.top - POPOVER_GAP - bounds.top;
  const flip = height > below && above > below;
  if (flip) {
    style.top = 'auto';
    style.bottom = 'calc(100% + 6px)';
  }
  if (height > below) style.maxHeight = `${Math.max(0, flip ? above : below)}px`;
  if (height > Math.max(above, below)) style.overflowY = 'auto';
}

function fitHorizontal(panel: HTMLElement, rect: { left: number; right: number }, bounds: PopoverBounds): void {
  const shift = rect.right > bounds.right ? bounds.right - rect.right : 0;
  const moved = rect.left + shift < bounds.left ? bounds.left - rect.left : shift;
  const parent = panel.offsetParent;
  if (moved === 0 || !parent) return;
  panel.style.left = `${rect.left + moved - parent.getBoundingClientRect().left}px`;
  panel.style.right = 'auto';
}

function fitAbsolute(panel: HTMLElement, trigger: HTMLElement | null): void {
  resetFit(panel.style);
  const anchor = trigger ?? panel.parentElement ?? panel;
  const bounds = popoverBounds(anchor);
  panel.style.maxWidth = `${bounds.right - bounds.left}px`;
  const rect = layoutRect(panel);
  fitVertical(panel, rect.top, anchor.getBoundingClientRect(), bounds);
  fitHorizontal(panel, rect, bounds);
}

export function useFitPopover(panel: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null> | null, open: boolean): void {
  useLayoutEffect(() => {
    const node = panel.current;
    if (!open || !node) return;
    const fit = () => fitAbsolute(node, trigger?.current ?? null);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [open, panel, trigger]);
}
