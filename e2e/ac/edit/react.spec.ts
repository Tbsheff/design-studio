import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  artboardTransform,
  createProject,
  evidence,
  previewFrame,
  readState,
  runFile,
} from "../../../scripts/ac-edit/helpers";
import { buildUserText } from "../../../src/server/agent/index";
import {
  frontFrame,
  mainDirection,
  selectInFrame,
  sendPrompt,
} from "../../support/studio";

function appSource(heading: string, extra = ""): string {
  return `export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <h1>${heading}</h1>
        <p>Stable paragraph text.</p>
        <button type="button" className="cta">Primary</button>${extra}
      </section>
    </main>
  );
}
`;
}

function listenerPid(port: number): string {
  try {
    return execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf-8" }
    ).trim();
  } catch {
    return "";
  }
}

async function marker(page: Page, origin: string): Promise<number | undefined> {
  const frame = await previewFrame(page, origin);

  return frame.evaluate(
    () => (window as unknown as { __acMarker?: number }).__acMarker
  );
}

test("aC-19 React edits use HMR on one dev server with no full reload", async ({
  page,
}) => {
  const { api, project } = await createProject(page, "Five Edit Hmr", "react");
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText("Five Edit Hmr", {
    timeout: 90_000,
  });
  const previewUrl = (await api.preview(project.id, main.id)).url;
  const { origin } = new URL(previewUrl);
  const port = Number(new URL(previewUrl).port);
  const serverPid = readState().pid;
  const pidBefore = listenerPid(port);
  const vite = await previewFrame(page, origin);
  await vite.evaluate(() => {
    (window as unknown as { __acMarker?: number }).__acMarker = 42;
  });
  const navigations: string[] = [];
  page.on("framenavigated", (navigated) => {
    if (navigated.url().startsWith(origin)) {
      navigations.push(navigated.url());
    }
  });

  const srcBefore = await page
    .locator("iframe.frame.front")
    .getAttribute("src");

  const appFile = path.join(main.workTree, "src", "App.tsx");

  const perEdit: {
    edit: number;
    port: number;
    pid: string;
    marker: number | undefined;
    frames: number;
    src: boolean;
    ms: number;
  }[] = [];

  for (let edit = 1; edit <= 5; edit += 1) {
    const started = Date.now();
    writeFileSync(appFile, appSource(`Hmr edit ${edit}`));
    await expect.soft(frame.locator("h1")).toHaveText(`Hmr edit ${edit}`);
    const nowUrl = (await api.preview(project.id, main.id)).url;
    perEdit.push({
      edit,
      frames: await page.locator("iframe.frame").count(),
      marker: await marker(page, origin),
      ms: Date.now() - started,
      pid: listenerPid(port),
      port: Number(new URL(nowUrl).port),
      src:
        (await page.locator("iframe.frame.front").getAttribute("src")) ===
        srcBefore,
    });
  }

  evidence("AC-19", { navigations, perEdit, pidBefore, port, serverPid });

  const parentOfListener = execFileSync(
    "ps",
    ["-o", "ppid=", "-p", pidBefore],
    { encoding: "utf-8" }
  ).trim();

  const grandparentOfListener = execFileSync(
    "ps",
    ["-o", "ppid=", "-p", parentOfListener],
    { encoding: "utf-8" }
  ).trim();

  evidence("AC-19-pid", {
    grandparentOfListener,
    listenerPid: pidBefore,
    parentOfListener,
    serverPid,
  });
  expect.soft(pidBefore).not.toBe(String(serverPid));
  expect
    .soft([parentOfListener, grandparentOfListener])
    .toContain(String(serverPid));

  for (const row of perEdit) {
    expect.soft(row.port).toBe(port);
    expect.soft(row.pid).toBe(pidBefore);
    expect.soft(row.marker).toBe(42);
    expect.soft(row.frames).toBe(1);
    expect.soft(row.src).toBe(true);
  }

  expect.soft(navigations).toEqual([]);
});

test("aC-20 HMR update keeps zoom, viewport, chat scroll, draft and selection", async ({
  page,
}) => {
  const { api, project } = await createProject(page, "Hmr State", "react");
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText("Hmr State", {
    timeout: 90_000,
  });

  for (let index = 1; index <= 4; index += 1) {
    await sendPrompt(
      page,
      `Heading filler ${index} with a few more words so the chat panel grows taller than its box`
    );
    await api.waitForRuns(project.id, index + 1);
  }

  await expect.soft(frame.locator("h1")).toContainText("Heading filler 4");
  await page.getByRole("radio", { name: "Mobile 390" }).click();
  await page.getByLabel("Zoom", { exact: true }).selectOption("1.25");
  const stage = await page.locator(".stage").boundingBox();

  if (!stage) {
    throw new Error("no stage");
  }
  await page.mouse.move(stage.x + 5, stage.y + stage.height - 5);
  await page.mouse.wheel(-30, 50);
  const chat = page.locator(".chat");

  const scrollable = await chat.evaluate(
    (el) => el.scrollHeight > el.clientHeight + 20
  );

  await chat.evaluate((el) => {
    el.scrollTop = 30;
  });
  await selectInFrame(page, "section.hero p");
  await page.getByRole("button", { name: /^Select/ }).click();
  await page.getByPlaceholder("Describe a change").fill("react draft survives");
  const { origin } = new URL((await api.preview(project.id, main.id)).url);
  const vite = await previewFrame(page, origin);
  await vite.evaluate(() => {
    (window as unknown as { __acMarker?: number }).__acMarker = 7;
  });

  const snapshot = async () => ({
    chatScrollTop: await chat.evaluate((el) => el.scrollTop),
    chips: await page.locator(".chip").count(),
    draft: await page.getByPlaceholder("Describe a change").inputValue(),
    selectedBoxes: await page.locator(".overlay .box.selected").count(),
    transform: await artboardTransform(page),
    viewport: await page
      .locator(
        '[role="radiogroup"][aria-label="Viewport"] [aria-checked="true"]'
      )
      .textContent(),
    zoom: await page.getByLabel("Zoom", { exact: true }).inputValue(),
  });

  const before = await snapshot();
  const appFile = path.join(main.workTree, "src", "App.tsx");
  writeFileSync(
    appFile,
    readFileSync(appFile, "utf-8").replace(
      /<h1>[^<]*<\/h1>/,
      "<h1>Hmr state updated</h1>"
    )
  );
  await expect.soft(frame.locator("h1")).toHaveText("Hmr state updated");
  await api.call("POST", `/api/projects/${project.id}/d/${main.id}/keep`);
  await expect.soft(page.locator(".banner")).toHaveCount(0);
  await page.waitForTimeout(300);
  const after = await snapshot();
  const markerAfter = await marker(page, origin);
  evidence("AC-20-hmr", { after, before, markerAfter, scrollable });
  expect.soft(markerAfter).toBe(7);
  expect.soft(after).toEqual(before);
  expect.soft(scrollable).toBe(true);
});

test("aC-23 React syntax error shows file and line in the studio", async ({
  page,
}) => {
  const { project } = await createProject(page, "Broken Build", "react");
  const main = mainDirection(project);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("Broken Build", {
    timeout: 90_000,
  });
  const appFile = path.join(main.workTree, "src", "App.tsx");
  const broken = `export default function App() {\n  const value = ;\n  return <main><h1>Broken</h1></main>;\n}\n`;
  writeFileSync(appFile, broken);
  const panel = page.getByRole("region", { name: "Preview errors" });
  await expect.soft(panel).toBeVisible();
  await expect.soft(panel).toContainText("App.tsx:2");
  const items = await panel.locator("li").allTextContents();
  await panel
    .locator("li", { hasText: "App.tsx:2" })
    .first()
    .getByRole("button", { name: "Send to agent" })
    .click();
  const draft = await page.getByPlaceholder("Describe a change").inputValue();
  writeFileSync(appFile, appSource("Fixed again"));
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("Fixed again", {
    timeout: 30_000,
  });
  evidence("AC-23-react", { draft, items });
  expect.soft(items.join("\n")).toMatch(/App\.tsx:2/);
  expect.soft(draft).toMatch(/App\.tsx:2/);
});

test("aC-27 and AC-32 React selection carries DOM, styles, source and edits the element", async ({
  page,
}) => {
  const { api, project } = await createProject(page, "React Select", "react");
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText("React Select", {
    timeout: 90_000,
  });
  const appFile = path.join(main.workTree, "src", "App.tsx");
  writeFileSync(appFile, appSource("React Select"));
  await expect.soft(frame.locator("button.cta")).toHaveText("Primary");
  await api.call("POST", `/api/projects/${project.id}/d/${main.id}/keep`);
  const before = readFileSync(appFile, "utf-8");
  await selectInFrame(page, "button.cta");
  await sendPrompt(page, "color #c00");
  const runs = await api.waitForRuns(project.id, 2);

  const run = runs.find(
    (candidate) => candidate.request.prompt === "color #c00"
  );

  if (!run) {
    throw new Error("run missing");
  }
  await expect
    .poll(() =>
      frame.locator("button.cta").evaluate((el) => getComputedStyle(el).color)
    )
    .toBe("rgb(204, 0, 0)");

  const h1Color = await frame
    .locator("h1")
    .evaluate((el) => getComputedStyle(el).color);

  const after = readFileSync(appFile, "utf-8");
  const stored = runFile(project.id, run.id);
  const selection = stored.request.selection?.[0];
  const userText = buildUserText({ designMd: "", request: stored.request });

  const changed = before
    .split("\n")
    .filter((line, index) => line !== after.split("\n")[index]);

  evidence("AC-27-react", {
    ancestors: selection?.ancestors,
    outerHTML: selection?.outerHTML,
    runId: run.id,
    selectionSource: selection?.source,
    selector: selection?.selector,
    styleKeys: Object.keys(selection?.styles ?? {}),
    tag: selection?.tag,
    userText,
  });
  evidence("AC-32-react", {
    after: after.split("\n").filter((line) => line.includes("cta")),
    changedLines: changed,
    h1Color,
    versionKind: (await api.versions(project.id, main.id)).length,
  });
  expect.soft(selection?.source?.file).toBe("src/App.tsx");
  expect.soft(selection?.source?.line).toBe(7);
  expect.soft(Object.keys(selection?.styles ?? {}).length).toBeGreaterThan(3);
  expect.soft(selection?.outerHTML).toContain("Primary");
  expect.soft(userText).toContain("source: src/App.tsx:7:");
  expect.soft(userText).toContain("styles: ");
  expect.soft(userText).toContain("outerHTML:");
  expect.soft(changed).toHaveLength(1);
  expect.soft(changed[0]).toContain('className="cta"');
  expect.soft(h1Color).not.toBe("rgb(204, 0, 0)");
});
