import { setTimeout as pause } from "node:timers/promises";

import type { RenderClip } from "../../../shared/render-rpc.js";
import type { RenderPage } from "../../preview/index.js";
import type { PageElement } from "./engine/index.js";
import {
  GUARD_SOURCE,
  PROBE_SOURCE,
  READ_BLOCKED_SOURCE,
} from "./walkthrough-probe.js";

interface PageProbe {
  readonly clip: RenderClip;
  readonly elements: readonly PageElement[];
  readonly url: string;
}

interface ActResult {
  readonly href: string | null;
  readonly isOk: boolean;
}

const SETTLE_MS = 300;

const READY_POLL_MS = 150;

const READY_TRIES = 30;

const SCROLL_FRACTION = 0.8;

const listPageElements = (page: RenderPage): Promise<PageProbe> =>
  page.evaluate<PageProbe>(PROBE_SOURCE);

const toActExpression = (
  action: "click" | "type",
  selector: string,
  text: string
): string => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return { isOk: false, href: null };
  el.scrollIntoView({ block: 'center' });
  if (${JSON.stringify(action)} === 'type') {
    el.focus();
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, ${JSON.stringify(text)}); else el.value = ${JSON.stringify(text)};
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { isOk: true, href: null };
  }
  const anchor = el.closest('a[href]');
  if (anchor && anchor.getAttribute('href') && !anchor.getAttribute('href').startsWith('#')) {
    const target = new URL(anchor.href, location.href);
    if (target.origin !== location.origin) return { isOk: false, href: null };
    return { isOk: true, href: target.href };
  }
  el.click();
  return { isOk: true, href: null };
})()`;

const setWriteGuard = (page: RenderPage): Promise<number> =>
  page.evaluate<number>(GUARD_SOURCE);

const toBlockedCount = async (page: RenderPage): Promise<number> => {
  try {
    return await page.evaluate<number>(READ_BLOCKED_SOURCE);
  } catch {
    return 0;
  }
};

const toReadyState = async (page: RenderPage): Promise<string> => {
  try {
    return await page.evaluate<string>("document.readyState");
  } catch {
    return "loading";
  }
};

const runReadyWait = async (page: RenderPage, tries: number): Promise<void> => {
  const state = await toReadyState(page);

  if (state === "complete" || tries <= 0) {
    return;
  }

  await pause(READY_POLL_MS);
  await runReadyWait(page, tries - 1);
};

const runSettle = async (page: RenderPage): Promise<void> => {
  await pause(SETTLE_MS);
  await runReadyWait(page, READY_TRIES);
};

const applyElementAction = async (
  page: RenderPage,
  action: "click" | "type",
  selector: string,
  text: string
): Promise<void> => {
  const result = await page.evaluate<ActResult>(
    toActExpression(action, selector, text)
  );

  if (result.href !== null) {
    await page.goto(result.href);

    return;
  }

  await runSettle(page);
};

const applyScroll = async (page: RenderPage): Promise<void> => {
  await page.evaluate<null>(
    `(() => { window.scrollBy(0, Math.round(window.innerHeight * ${SCROLL_FRACTION})); return null; })()`
  );
  await pause(SETTLE_MS);
};

export {
  applyElementAction,
  applyScroll,
  listPageElements,
  setWriteGuard,
  toBlockedCount,
};

export type { PageProbe };
