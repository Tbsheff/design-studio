import { pick } from "./pick.js";

const OFF = "data-tip-off";
const AUTO = "data-tip-auto";
const TIP_ALIGN = "data-tip-align";
const TIP_SIDE = "data-tip-side";
const EDGE = 4;
const TIP_GAP = 6;
const INSTANT = "data-tip-warm";
const INSTANT_AFTER_MS = 500;
const RESET_AFTER_MS = 300;
const EXPANDED = "aria-expanded";

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const release = (host: Element): void => {
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

const narrowBox = (
  box: Box,
  rect: DOMRect,
  clips: { clipsX: boolean; clipsY: boolean }
): void => {
  if (clips.clipsX) {
    box.left = Math.max(box.left, rect.left);
    box.right = Math.min(box.right, rect.right);
  }

  if (clips.clipsY) {
    box.top = Math.max(box.top, rect.top);
    box.bottom = Math.min(box.bottom, rect.bottom);
  }
};

const clipBox = (host: Element): Box => {
  const box: Box = {
    bottom: globalThis.innerHeight,
    left: 0,
    right: globalThis.innerWidth,
    top: 0,
  };

  for (
    let node = host.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    const clipsX = style.overflowX !== "visible";
    const clipsY = style.overflowY !== "visible";

    if (clipsX || clipsY) {
      narrowBox(box, node.getBoundingClientRect(), { clipsX, clipsY });
    }
  }

  return box;
};

const restoreAuto = (host: Element): void => {
  const auto = host.getAttribute(AUTO);

  if (auto === null) {
    return;
  }

  if (auto.includes("align")) {
    host.removeAttribute(TIP_ALIGN);
  }

  if (auto.includes("side")) {
    host.removeAttribute(TIP_SIDE);
  }

  if (auto.includes("was-top")) {
    host.setAttribute(TIP_SIDE, "top");
  }

  host.removeAttribute(AUTO);
};

const fitAlign = (
  host: Element,
  rect: DOMRect,
  box: Box,
  width: number
): string[] => {
  if (host.hasAttribute(TIP_ALIGN)) {
    return [];
  }

  const middle = rect.left + rect.width / 2;
  const overRight = middle + width / 2 > box.right - EDGE;
  const overLeft = middle - width / 2 < box.left + EDGE;

  if (!overRight && !overLeft) {
    return [];
  }

  host.setAttribute(TIP_ALIGN, pick(overRight, "end", "start"));

  return ["align"];
};

const fitSide = (
  host: Element,
  rect: DOMRect,
  box: Box,
  height: number
): string[] => {
  const fitsBelow = rect.bottom + TIP_GAP + height <= box.bottom - EDGE;
  const fitsAbove = rect.top - TIP_GAP - height >= box.top + EDGE;
  const side = host.getAttribute(TIP_SIDE);

  if (side === null && !fitsBelow && fitsAbove) {
    host.setAttribute(TIP_SIDE, "top");

    return ["side"];
  }

  if (side === "top" && !fitsAbove && fitsBelow) {
    host.setAttribute(TIP_SIDE, "bottom");

    return ["side", "was-top"];
  }

  return [];
};

const fitTip = (host: Element): void => {
  restoreAuto(host);
  const tip = getComputedStyle(host, "::after");
  const width = Number(tip.width);
  const height = Number(tip.height);

  if (!width || !height) {
    return;
  }

  const rect = host.getBoundingClientRect();
  const box = clipBox(host);

  const moved = [
    ...fitAlign(host, rect, box, width),
    ...fitSide(host, rect, box, height),
  ];

  if (moved.length > 0) {
    host.setAttribute(AUTO, moved.join(" "));
  }
};

const tipHost = (target: EventTarget | null): Element | null => {
  if (target instanceof Element) {
    return target.closest("[data-tip]");
  }

  return null;
};

type TimerId = ReturnType<typeof setTimeout>;

const clearTimer = (id: TimerId | null): void => {
  if (id !== null) {
    globalThis.clearTimeout(id);
  }
};

const installInstantTips = (): void => {
  const root = document.documentElement;
  let showTimer: TimerId | null = null;
  let hideTimer: TimerId | null = null;

  document.addEventListener(
    "pointerover",
    (event) => {
      if (!tipHost(event.target)) {
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
      const host = tipHost(event.target);
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

const onTipEnter = (event: Event): void => {
  const host = tipHost(event.target);

  if (!host || host.hasAttribute(OFF)) {
    return;
  }

  let from: EventTarget | null = null;

  if (event instanceof PointerEvent) {
    from = event.relatedTarget;
  }

  if (from instanceof Node && host.contains(from)) {
    return;
  }

  fitTip(host);
};

const installTipGuard = (): void => {
  installInstantTips();
  document.addEventListener(
    "pointerdown",
    (event) => {
      const host = tipHost(event.target);

      if (!host || host.hasAttribute(OFF)) {
        return;
      }

      host.setAttribute(OFF, "");
      release(host);
    },
    true
  );
  document.addEventListener("pointerover", onTipEnter, true);
  document.addEventListener("focusin", onTipEnter, true);
};

export { installTipGuard };
