import { pick } from "./pick.js";

const TIP = "data-tip";
const OFF = "data-tip-off";
const TIP_ALIGN = "data-tip-align";
const TIP_SIDE = "data-tip-side";
const EXPANDED = "aria-expanded";
const INSTANT = "data-tip-warm";
const LAYER_CLASS = "ui-tip";
const MARGIN = 8;
const TIP_MAX_WIDTH = 240;
const TIP_GAP = 6;
const INSTANT_AFTER_MS = 500;
const RESET_AFTER_MS = 300;
const HIDE_KEYS = new Set(["Escape", "Enter", " "]);

interface TipSize {
  readonly width: number;
  readonly height: number;
}

interface TipPoint {
  readonly left: number;
  readonly top: number;
}

type TimerId = ReturnType<typeof setTimeout>;

const toTipHost = (target: EventTarget | null): Element | null => {
  if (target instanceof Element) {
    return target.closest(`[${TIP}]`);
  }

  return null;
};

const toTipText = (host: Element): string => {
  const text = host.getAttribute(TIP) ?? "";

  const isMuted =
    host.getAttribute(EXPANDED) === "true" ||
    host.hasAttribute(OFF) ||
    getComputedStyle(host).getPropertyValue("--tip").trim() === "off";

  return pick(isMuted, "", text);
};

const clampTo = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(value, high));

const toAlignedLeft = (host: Element, rect: DOMRect, width: number): number => {
  const align = host.getAttribute(TIP_ALIGN);

  if (align === "start") {
    return rect.left;
  }

  if (align === "end") {
    return rect.right - width;
  }

  return rect.left + rect.width / 2 - width / 2;
};

const toVerticalPoint = (
  host: Element,
  rect: DOMRect,
  size: TipSize
): TipPoint => {
  const below = rect.bottom + TIP_GAP;
  const above = rect.top - TIP_GAP - size.height;
  const fitsBelow = below + size.height <= globalThis.innerHeight - MARGIN;
  const fitsAbove = above >= MARGIN;
  const wantsTop = host.getAttribute(TIP_SIDE) === "top";

  const isTop = pick(
    wantsTop,
    fitsAbove || !fitsBelow,
    !fitsBelow && fitsAbove
  );

  return {
    left: toAlignedLeft(host, rect, size.width),
    top: pick(isTop, above, below),
  };
};

const toSidePoint = (
  host: Element,
  rect: DOMRect,
  size: TipSize
): TipPoint | null => {
  const side = host.getAttribute(TIP_SIDE);

  if (side !== "right" && side !== "left") {
    return null;
  }

  const right = rect.right + TIP_GAP;
  const left = rect.left - TIP_GAP - size.width;
  const fitsRight = right + size.width <= globalThis.innerWidth - MARGIN;
  const fitsLeft = left >= MARGIN;

  if (!fitsRight && !fitsLeft) {
    return null;
  }

  const isLeft = pick(side === "left", fitsLeft, !fitsRight);

  return {
    left: pick(isLeft, left, right),
    top: rect.top + rect.height / 2 - size.height / 2,
  };
};

const placeTip = (layer: HTMLElement, host: Element): void => {
  const rect = host.getBoundingClientRect();
  const size = { height: layer.offsetHeight, width: layer.offsetWidth };

  const point =
    toSidePoint(host, rect, size) ?? toVerticalPoint(host, rect, size);

  const left = clampTo(
    point.left,
    MARGIN,
    globalThis.innerWidth - MARGIN - size.width
  );

  const top = clampTo(
    point.top,
    MARGIN,
    globalThis.innerHeight - MARGIN - size.height
  );

  layer.style.left = `${Math.round(left)}px`;
  layer.style.top = `${Math.round(top)}px`;
};

const createLayer = (): HTMLElement => {
  const layer = document.createElement("div");
  layer.className = LAYER_CLASS;
  layer.setAttribute("popover", "manual");
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  return layer;
};

const clearTimer = (id: TimerId | null): void => {
  if (id !== null) {
    globalThis.clearTimeout(id);
  }
};

const installWarmTips = (): void => {
  const root = document.documentElement;
  let showTimer: TimerId | null = null;
  let hideTimer: TimerId | null = null;

  document.addEventListener(
    "pointerover",
    (event) => {
      if (!toTipHost(event.target)) {
        return;
      }

      clearTimer(hideTimer);

      if (!root.hasAttribute(INSTANT)) {
        clearTimer(showTimer);
        showTimer = globalThis.setTimeout(
          () => root.setAttribute(INSTANT, ""),
          INSTANT_AFTER_MS
        );
      }
    },
    true
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const host = toTipHost(event.target);
      const to = event.relatedTarget;

      if (!host || (to instanceof Node && host.contains(to))) {
        return;
      }

      clearTimer(showTimer);
      clearTimer(hideTimer);
      hideTimer = globalThis.setTimeout(
        () => root.removeAttribute(INSTANT),
        RESET_AFTER_MS
      );
    },
    true
  );
};

const releaseOff = (host: Element): void => {
  const clear = (): void => {
    const isHeld =
      host.getAttribute(EXPANDED) === "true" ||
      host.matches(":hover") ||
      host.matches(":focus-visible");

    if (!isHeld) {
      host.removeAttribute(OFF);
      host.removeEventListener("pointerleave", clear);
      host.removeEventListener("focusout", clear);
    }
  };

  host.addEventListener("pointerleave", clear);
  host.addEventListener("focusout", clear);
};

interface TipLayer {
  readonly hide: () => void;
  readonly show: (host: Element) => void;
  readonly isCurrent: (host: Element | null) => boolean;
  readonly isLeaving: (to: EventTarget | null) => boolean;
}

const toLayerWidth = (): number =>
  Math.min(TIP_MAX_WIDTH, globalThis.innerWidth - MARGIN * 2);

const createTipLayer = (): TipLayer => {
  const layer = createLayer();
  let current: Element | null = null;

  const hide = (): void => {
    current = null;

    if (layer.matches(":popover-open")) {
      layer.hidePopover();
    }
  };

  const show = (host: Element): void => {
    const text = toTipText(host);

    if (!text) {
      hide();

      return;
    }

    hide();
    current = host;
    layer.textContent = text;
    layer.style.maxWidth = `${toLayerWidth()}px`;
    layer.showPopover();
    placeTip(layer, host);
  };

  const isCurrent = (host: Element | null): boolean =>
    host !== null && host === current;

  const isLeaving = (to: EventTarget | null): boolean =>
    current !== null && !(to instanceof Node && current.contains(to));

  return { hide, isCurrent, isLeaving, show };
};

const listenPointer = (tips: TipLayer): void => {
  document.addEventListener(
    "pointerover",
    (event) => {
      const host = toTipHost(event.target);
      const from = event.relatedTarget;

      if (!host || tips.isCurrent(host)) {
        return;
      }

      if (from instanceof Node && host.contains(from)) {
        return;
      }

      tips.show(host);
    },
    true
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const host = toTipHost(event.target);

      if (tips.isCurrent(host) && tips.isLeaving(event.relatedTarget)) {
        tips.hide();
      }
    },
    true
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      tips.hide();
      const host = toTipHost(event.target);

      if (!host || host.hasAttribute(OFF)) {
        return;
      }

      host.setAttribute(OFF, "");
      releaseOff(host);
    },
    true
  );
};

const listenFocus = (tips: TipLayer): void => {
  let isEscaped = false;

  document.addEventListener(
    "focusin",
    (event) => {
      const host = toTipHost(event.target);

      if (!isEscaped && host?.matches(":focus-visible")) {
        tips.show(host);
      }
    },
    true
  );
  document.addEventListener(
    "keydown",
    (event) => {
      isEscaped = event.key === "Escape";
    },
    true
  );
  document.addEventListener(
    "pointermove",
    () => {
      isEscaped = false;
    },
    true
  );
  document.addEventListener(
    "focusout",
    (event) => {
      if (tips.isCurrent(toTipHost(event.target))) {
        tips.hide();
      }
    },
    true
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (HIDE_KEYS.has(event.key)) {
        tips.hide();
      }
    },
    true
  );
  globalThis.addEventListener("wheel", tips.hide, {
    capture: true,
    passive: true,
  });
  globalThis.addEventListener("blur", tips.hide);
};

const installTipGuard = (): void => {
  const tips = createTipLayer();
  listenPointer(tips);
  listenFocus(tips);
  installWarmTips();
};

export { installTipGuard };
