import type { Page } from "playwright-core";

const CURSOR_MOVE_MS = 400;

const toCursorExpression = (x: number, y: number, isFirst: boolean): string =>
  `(() => {
    let dot = document.getElementById('__flow_cursor');
    if (!dot) {
      dot = document.createElement('div');
      dot.id = '__flow_cursor';
      dot.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(24,24,27,0.88);border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.45);z-index:2147483647;pointer-events:none;transition:transform ${CURSOR_MOVE_MS}ms cubic-bezier(0.4,0,0.2,1)';
      document.documentElement.append(dot);
    }
    if (${JSON.stringify(isFirst)}) { dot.style.transition = 'none'; }
    dot.style.transform = 'translate(${x}px,${y}px)';
    if (${JSON.stringify(isFirst)}) { void dot.offsetWidth; dot.style.transition = ''; }
    return true;
  })()`;

const toRippleExpression = (x: number, y: number): string =>
  `(() => {
    const ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;left:${x}px;top:${y}px;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(59,130,246,0.9);z-index:2147483646;pointer-events:none';
    document.documentElement.append(ring);
    ring.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 500, easing: 'ease-out' }).finished.then(() => ring.remove());
    return true;
  })()`;

const toOverlayExpression = (url: string, kind: "modal" | "drawer"): string => {
  const frameStyle = {
    drawer:
      "width:min(480px,45%);height:100%;border:0;margin-left:auto;background:#fff;box-shadow:-8px 0 30px rgba(0,0,0,0.35)",
    modal:
      "width:min(760px,72%);height:72%;border:0;border-radius:14px;background:#fff;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,0.45)",
  }[kind];

  return `(() => {
    const overlay = document.createElement('div');
    overlay.id = '__flow_overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2147483000;display:flex';
    const frame = document.createElement('iframe');
    frame.src = ${JSON.stringify(url)};
    frame.style.cssText = ${JSON.stringify(frameStyle)};
    overlay.append(frame);
    document.body.append(overlay);
    return true;
  })()`;
};

const CLOSE_OVERLAY = `(() => { document.getElementById('__flow_overlay')?.remove(); return true; })()`;

const setCursor = async (
  page: Page,
  at: { readonly isFirst: boolean; readonly x: number; readonly y: number }
): Promise<void> => {
  await page.evaluate(toCursorExpression(at.x, at.y, at.isFirst));
};

const startRipple = async (page: Page, x: number, y: number): Promise<void> => {
  await page.evaluate(toRippleExpression(x, y));
};

const startOverlay = async (
  page: Page,
  url: string,
  kind: "modal" | "drawer"
): Promise<void> => {
  await page.evaluate(toOverlayExpression(url, kind));
};

const stopOverlay = async (page: Page): Promise<void> => {
  await page.evaluate(CLOSE_OVERLAY);
};

export { CURSOR_MOVE_MS, setCursor, startOverlay, startRipple, stopOverlay };
