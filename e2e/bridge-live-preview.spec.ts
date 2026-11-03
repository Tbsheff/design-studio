import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { loadBridgeScript } from "../src/server/preview/index";

const ORIGIN = "http://bridge-preview.localhost:4999";
const TOKEN = "live-preview-token";

const PAGE = `<!doctype html><html><head><script src="/__studio/bridge.js"></script></head><body>
<h1 id="title" style="color: green !important; margin: 0 auto">Hello <!-- c --></h1>
<p id="plain">Plain</p>
<div id="parent">Text <b>bold</b></div>
</body></html>`;

async function openBridgePage(page: Page): Promise<void> {
  const bridge = await loadBridgeScript();
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/__studio/bridge.js") {
      await route.fulfill({ body: bridge, contentType: "text/javascript" });

      return;
    }

    if (url.pathname === "/__studio/changes") {
      await route.fulfill({
        body: '{"changedAt":0}',
        contentType: "application/json",
      });

      return;
    }

    await route.fulfill({ body: PAGE, contentType: "text/html" });
  });
  await page.goto(
    `${ORIGIN}/index.html?__studio_token=${TOKEN}&__studio_parent=${encodeURIComponent(ORIGIN)}`
  );
  await page.waitForFunction(
    () =>
      (window as unknown as Record<string, unknown>).__studioBridgeStarted ===
      true
  );
}

async function send(
  page: Page,
  message: Record<string, unknown>,
  token = TOKEN
): Promise<void> {
  await page.evaluate(
    ([body, origin]) => {
      window.postMessage(body, origin as string);
    },
    [{ ns: "studio", token, ...message }, ORIGIN] as const
  );
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
}

function snapshot(page: Page): Promise<{
  title: string | null;
  plain: string | null;
  titleHtml: string;
  plainHtml: string;
  parentHtml: string;
}> {
  return page.evaluate(() => {
    const byId = (id: string): Element =>
      document.querySelector(`#${id}`) as Element;

    return {
      parentHtml: byId("parent").innerHTML,
      plain: byId("plain").getAttribute("style"),
      plainHtml: byId("plain").innerHTML,
      title: byId("title").getAttribute("style"),
      titleHtml: byId("title").innerHTML,
    };
  });
}

test("bridge live preview applies style and text and resets them exactly", async ({
  page,
}) => {
  await openBridgePage(page);
  const before = await snapshot(page);

  await send(page, {
    selector: "#title",
    style: { color: "red", "font-size": "40px", position: "fixed" },
    type: "preview-style",
  });
  await send(page, {
    selector: "#plain",
    style: { "background-color": "blue", "margin-top": null },
    type: "preview-style",
  });
  await send(page, {
    selector: "#title",
    style: { color: "purple" },
    type: "preview-style",
  });
  await send(page, {
    selector: "#plain",
    text: "Live <text>",
    type: "preview-text",
  });
  await send(page, {
    selector: "#plain",
    text: "Live again",
    type: "preview-text",
  });
  await send(page, { selector: "#parent", text: "nope", type: "preview-text" });

  const during = await page.evaluate(() => {
    const title = document.querySelector("#title") as HTMLElement;
    const plain = document.querySelector("#plain") as HTMLElement;

    return {
      color: title.style.getPropertyValue("color"),
      parentHtml: (document.getElementById("parent") as HTMLElement).innerHTML,
      plainBg: plain.style.getPropertyValue("background-color"),
      plainText: plain.textContent,
      position: title.style.getPropertyValue("position"),
      size: title.style.getPropertyValue("font-size"),
    };
  });

  expect.soft(during).toEqual({
    color: "purple",
    parentHtml: before.parentHtml,
    plainBg: "blue",
    plainText: "Live again",
    position: "",
    size: "40px",
  });

  await send(
    page,
    { selector: "#plain", style: { color: "red" }, type: "preview-style" },
    "wrong-token"
  );
  expect.soft((await snapshot(page)).plain).toBe("background-color: blue;");

  await send(page, { type: "preview-reset" });
  const after = await snapshot(page);
  expect.soft(after.plain).toBeNull();
  expect.soft(after.plainHtml).toBe(before.plainHtml);
  expect.soft(after.titleHtml).toBe(before.titleHtml);

  const titleStyle = await page.evaluate(() => {
    const title = document.querySelector("#title") as HTMLElement;

    return {
      color: title.style.getPropertyValue("color"),
      margin: title.style.getPropertyValue("margin"),
      priority: title.style.getPropertyPriority("color"),
      size: title.style.getPropertyValue("font-size"),
    };
  });

  expect.soft(titleStyle).toEqual({
    color: "green",
    margin: "0px auto",
    priority: "important",
    size: "",
  });
});
