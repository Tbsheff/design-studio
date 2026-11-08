import { pick } from "./pick.js";

const OFF = "data-tip-off";
const AUTO = "data-tip-auto";
const TIP_ALIGN = "data-tip-align";
const TIP_SIDE = "data-tip-side";
const EDGE = 4;

const release = (host: Element): void => {
  const clear = (): void => {
    if (
      host.getAttribute("aria-expanded") === "true" ||
      host.matches(":hover") ||
      host.matches(":focus-visible")
    ) {
      return;
    }

    host.removeAttribute(OFF);
    host.removeEventListener("pointerleave", clear);
    host.removeEventListener("focusout", clear);
  };

  host.addEventListener("pointerleave", clear);
  host.addEventListener("focusout", clear);
};

const clipBox = (
  host: Element
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} => {
  const box = {
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
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

    if (!clipsX && !clipsY) {
      continue;
    }

    const rect = node.getBoundingClientRect();

    if (clipsX) {
      box.left = Math.max(box.left, rect.left);
      box.right = Math.min(box.right, rect.right);
    }

    if (clipsY) {
      box.top = Math.max(box.top, rect.top);
      box.bottom = Math.min(box.bottom, rect.bottom);
    }
  }

  return box;
};

type Box = ReturnType<typeof clipBox>;

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
  const fitsBelow = rect.bottom + 6 + height <= box.bottom - EDGE;
  const fitsAbove = rect.top - 6 - height >= box.top + EDGE;
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

const WARM = "data-tip-warm";
const WARM_AFTER_MS = 500;
const COOL_AFTER_MS = 300;

const installWarmTips = (): void => {
  const root = document.documentElement;
  let warmTimer = 0;
  let coolTimer = 0;
  document.addEventListener(
    "pointerover",
    (event) => {
      if (!tipHost(event.target)) {
        return;
      }

      window.clearTimeout(coolTimer);

      if (!root.hasAttribute(WARM)) {
        window.clearTimeout(warmTimer);
        warmTimer = window.setTimeout(
          () => root.setAttribute(WARM, ""),
          WARM_AFTER_MS
        );
      }
    },
    true
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const host = tipHost(event.target);

      if (!host) {
        return;
      }

      const to = event.relatedTarget;

      if (to instanceof Node && host.contains(to)) {
        return;
      }

      window.clearTimeout(warmTimer);
      window.clearTimeout(coolTimer);
      coolTimer = window.setTimeout(
        () => root.removeAttribute(WARM),
        COOL_AFTER_MS
      );
    },
    true
  );
};

export function installTipGuard(): void {
  installWarmTips();
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

  const onEnter = (event: Event): void => {
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

  document.addEventListener("pointerover", onEnter, true);
  document.addEventListener("focusin", onEnter, true);
}
