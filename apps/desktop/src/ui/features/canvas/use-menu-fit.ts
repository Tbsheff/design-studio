import { useCallback } from "react";
import type { RefCallback, RefObject } from "react";

import { toMenuFit, toVisibleBounds } from "./menu-fit-model.js";
import type {
  MenuBox,
  MenuFit,
  MenuSize,
  PanelInset,
} from "./menu-fit-model.js";

type MenuFitKind = "root" | "submenu";

const STAGE = ".stage";
const PANEL_OPEN = '[data-inspector="open"]';
const SUBMENU_GAP = 2;
const SUBMENU_LIFT = 4;
const PLACE_X = "--menu-left";
const PLACE_Y = "--menu-top";
const SHIFT_X = "--menu-shift-x";
const SHIFT_Y = "--menu-shift-y";
const PIXEL_UNIT = /px$/u;

const stopNothing: () => void = (): null => null;

const toPixels = (value: string): number => {
  const parsed = Number(value.trim().replace(PIXEL_UNIT, ""));

  if (Number.isNaN(parsed) || value.trim() === "") {
    return 0;
  }

  return parsed;
};

const toPanelInset = (stage: Element): PanelInset => {
  const style = getComputedStyle(stage);
  const gap = toPixels(style.getPropertyValue("--dock-gap"));
  const width = toPixels(style.getPropertyValue("--inspector-w"));

  return {
    isOpen: stage.closest(PANEL_OPEN) !== null && width > 0,
    width: width + gap * 2,
  };
};

const toBounds = (menu: HTMLElement): MenuBox => {
  const stage = menu.closest(STAGE);
  const view = { height: globalThis.innerHeight, width: globalThis.innerWidth };

  if (stage === null) {
    return toVisibleBounds(null, view, { isOpen: false, width: 0 });
  }

  return toVisibleBounds(
    stage.getBoundingClientRect(),
    view,
    toPanelInset(stage)
  );
};

const toSize = (menu: HTMLElement): MenuSize => ({
  height: menu.offsetHeight,
  width: menu.offsetWidth,
});

const toCurrentShift = (menu: HTMLElement): MenuSize => ({
  height: toPixels(menu.style.getPropertyValue(SHIFT_Y)),
  width: toPixels(menu.style.getPropertyValue(SHIFT_X)),
});

const toLayoutOrigin = (menu: HTMLElement): MenuBox => {
  const parent = menu.offsetParent;
  const shift = toCurrentShift(menu);

  if (parent === null) {
    return menu.getBoundingClientRect();
  }

  const origin = parent.getBoundingClientRect();
  const start = origin.left + menu.offsetLeft - shift.width;
  const head = origin.top + menu.offsetTop - shift.height;

  return {
    bottom: head + menu.offsetHeight,
    left: start,
    right: start + menu.offsetWidth,
    top: head,
  };
};

const toRootFit = (menu: HTMLElement): MenuFit => {
  const anchor = toLayoutOrigin(menu);

  return toMenuFit({
    anchor,
    bounds: toBounds(menu),
    gap: null,
    size: toSize(menu),
    top: anchor.top,
  });
};

const isFixed = (menu: HTMLElement): boolean =>
  getComputedStyle(menu).position === "fixed";

const toSubmenuTop = (menu: HTMLElement, hostRect: DOMRect): number => {
  if (isFixed(menu)) {
    return hostRect.top - SUBMENU_LIFT;
  }

  return hostRect.top + menu.offsetTop - toCurrentShift(menu).height;
};

const toSubmenuFit = (menu: HTMLElement, hostRect: DOMRect): MenuFit =>
  toMenuFit({
    anchor: hostRect,
    bounds: toBounds(menu),
    gap: SUBMENU_GAP,
    size: toSize(menu),
    top: toSubmenuTop(menu, hostRect),
  });

const toFixedLeft = (
  menu: HTMLElement,
  hostRect: DOMRect,
  fit: MenuFit
): number => {
  if (fit.side === "left") {
    return hostRect.left - SUBMENU_GAP - menu.offsetWidth + fit.shiftX;
  }

  return hostRect.right + SUBMENU_GAP + fit.shiftX;
};

const setFixedPlace = (
  menu: HTMLElement,
  hostRect: DOMRect,
  fit: MenuFit
): void => {
  const left = toFixedLeft(menu, hostRect, fit);
  const top = hostRect.top - SUBMENU_LIFT + fit.shiftY;

  menu.style.setProperty(PLACE_X, `${left}px`);
  menu.style.setProperty(PLACE_Y, `${top}px`);

  const placed = menu.getBoundingClientRect();

  menu.style.setProperty(PLACE_X, `${left * 2 - placed.left}px`);
  menu.style.setProperty(PLACE_Y, `${top * 2 - placed.top}px`);
};

const setShift = (menu: HTMLElement, fit: MenuFit): void => {
  menu.style.setProperty(SHIFT_X, `${fit.shiftX}px`);
  menu.style.setProperty(SHIFT_Y, `${fit.shiftY}px`);
};

const setMenuFit = (menu: HTMLElement, kind: MenuFitKind): void => {
  if (menu.offsetWidth === 0 || menu.offsetHeight === 0) {
    return;
  }

  const host = menu.parentElement;

  if (kind === "submenu" && host !== null) {
    const hostRect = host.getBoundingClientRect();
    const fit = toSubmenuFit(menu, hostRect);

    menu.dataset.side = fit.side;
    setShift(menu, fit);

    if (isFixed(menu)) {
      setFixedPlace(menu, hostRect, fit);
    }

    return;
  }

  const fit = toRootFit(menu);

  menu.dataset.side = fit.side;
  setShift(menu, fit);
};

const watchMenuFit = (menu: HTMLElement, kind: MenuFitKind): (() => void) => {
  const fit = (): void => setMenuFit(menu, kind);
  const host = menu.parentElement;
  const observer = new ResizeObserver(fit);

  menu.dataset.menuFit = kind;
  fit();
  observer.observe(menu);
  observer.observe(document.documentElement);

  if (kind === "submenu" && host !== null) {
    host.addEventListener("pointerenter", fit);
    host.addEventListener("focusin", fit);
  }

  return (): void => {
    observer.disconnect();
    host?.removeEventListener("pointerenter", fit);
    host?.removeEventListener("focusin", fit);
  };
};

const useMenuFit = <Element extends HTMLElement>(
  kind: MenuFitKind,
  ref: RefObject<Element | null> | null
): RefCallback<Element> =>
  useCallback(
    (element: Element | null): (() => void) => {
      if (ref !== null) {
        ref.current = element;
      }

      if (element === null) {
        return stopNothing;
      }

      const stop = watchMenuFit(element, kind);

      return (): void => {
        stop();

        if (ref !== null) {
          ref.current = null;
        }
      };
    },
    [kind, ref]
  );

export { useMenuFit };

export type { MenuFitKind };
