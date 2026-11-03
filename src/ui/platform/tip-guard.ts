const OFF = "data-tip-off";
const AUTO = "data-tip-auto";
const EDGE = 4;

function release(host: Element): void {
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
}

function clipBox(host: Element): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
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
}

type Box = ReturnType<typeof clipBox>;

function restoreAuto(host: Element): void {
  const auto = host.getAttribute(AUTO);

  if (auto === null) {
    return;
  }

  if (auto.includes("align")) {
    delete host.dataset.tipAlign;
  }

  if (auto.includes("side")) {
    delete host.dataset.tipSide;
  }

  if (auto.includes("was-top")) {
    host.dataset.tipSide = "top";
  }

  host.removeAttribute(AUTO);
}

function fitAlign(
  host: Element,
  rect: DOMRect,
  box: Box,
  width: number
): string[] {
  if (Object.hasOwn(host.dataset, "tipAlign")) {
    return [];
  }

  const middle = rect.left + rect.width / 2;
  const overRight = middle + width / 2 > box.right - EDGE;
  const overLeft = middle - width / 2 < box.left + EDGE;

  if (!overRight && !overLeft) {
    return [];
  }

  host.dataset.tipAlign = overRight ? "end" : "start";

  return ["align"];
}

function fitSide(
  host: Element,
  rect: DOMRect,
  box: Box,
  height: number
): string[] {
  const fitsBelow = rect.bottom + 6 + height <= box.bottom - EDGE;
  const fitsAbove = rect.top - 6 - height >= box.top + EDGE;
  const side = host.dataset.tipSide;

  if (side === null && !fitsBelow && fitsAbove) {
    host.dataset.tipSide = "top";

    return ["side"];
  }

  if (side === "top" && !fitsAbove && fitsBelow) {
    host.dataset.tipSide = "bottom";

    return ["side", "was-top"];
  }

  return [];
}

function fitTip(host: Element): void {
  restoreAuto(host);
  const tip = getComputedStyle(host, "::after");
  const width = Number.parseFloat(tip.width);
  const height = Number.parseFloat(tip.height);

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
}

function tipHost(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest("[data-tip]") : null;
}

const WARM = "data-tip-warm";
const WARM_AFTER_MS = 500;
const COOL_AFTER_MS = 300;

function installWarmTips(): void {
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
}

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

    const from = event instanceof PointerEvent ? event.relatedTarget : null;

    if (from instanceof Node && host.contains(from)) {
      return;
    }

    fitTip(host);
  };

  document.addEventListener("pointerover", onEnter, true);
  document.addEventListener("focusin", onEnter, true);
}
