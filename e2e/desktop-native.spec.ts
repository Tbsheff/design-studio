import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";

import type { Project, RunSummary, Version } from "../src/shared/contracts";
import { desktopEnv, launchDesktop } from "./support/desktop-app";
import { clickCreate } from "./support/studio";

test.describe.configure({ mode: "serial" });

interface Recorded {
  commands: { type: string }[];
  notices: { title: string; body: string; projectId: string; status: string }[];
  reveals: string[];
  exports: string[];
  recents: { id: string; folder: string }[];
  dialogs: string[];
}

let app: ElectronApplication;
let page: Page;
let origin = "";
let token = "";
let work = "";
let userData = "";

async function call<T>(
  method: string,
  route: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${origin}${route}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "x-studio-token": token,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    method,
  });

  if (!res.ok) {
    throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function recorded(): Promise<Recorded> {
  return app.evaluate(
    () => (globalThis as unknown as { __rec: Recorded }).__rec
  );
}

async function clickMenu(id: string): Promise<void> {
  await app.evaluate(({ Menu }, menuId) => {
    const item = Menu.getApplicationMenu()?.getMenuItemById(menuId);

    if (!item) {
      throw new Error(`no menu item ${menuId}`);
    }
    item.click();
  }, id);
}

async function finished(pid: string): Promise<number> {
  return (await call<RunSummary[]>("GET", `/api/projects/${pid}/runs`)).filter(
    (run) => run.status !== "running"
  ).length;
}

function site(name: string): string {
  const dir = path.join(work, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html><html><body><h1>${name}</h1></body></html>\n`
  );

  return realpathSync(dir);
}

async function openedProjectName(): Promise<string> {
  await expect.soft(page.locator(".topbar")).toBeVisible();

  return (await page.locator(".topbar").textContent()).trim();
}

test.beforeAll(async () => {
  work = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "studio desktop native "))
  );
  userData = path.join(work, "user-data");
  mkdirSync(path.join(work, "downloads"), { recursive: true });
  app = await launchDesktop(
    desktopEnv(work, {
      STUDIO_DESKTOP_DOWNLOADS: path.join(work, "downloads"),
      STUDIO_DESKTOP_NOTIFY: "off",
    })
  );
  page = await app.firstWindow({ timeout: 120_000 });
  await expect
    .soft(page.getByRole("heading", { name: "New project" }))
    .toBeVisible({
      timeout: 60_000,
    });
  origin = new URL(page.url()).origin;
  token =
    (await page.locator('meta[name="studio-token"]').getAttribute("content")) ??
    "";
  await app.evaluate(({ app: electronApp, shell }) => {
    const rec: Recorded = {
      commands: [],
      dialogs: [],
      exports: [],
      notices: [],
      recents: [],
      reveals: [],
    };

    (globalThis as unknown as { __rec: Recorded }).__rec = rec;
    electronApp.on("studio-command" as "ready", (command: unknown) =>
      rec.commands.push(command as { type: string })
    );
    electronApp.on("studio-notification" as "ready", (notice: unknown) =>
      rec.notices.push(notice as Recorded["notices"][number])
    );
    electronApp.on("studio-export" as "ready", (file: unknown) =>
      rec.exports.push(String(file))
    );
    electronApp.on("studio-recent" as "ready", (entry: unknown) =>
      rec.recents.push(entry as { id: string; folder: string })
    );
    shell.showItemInFolder = (target: string) => {
      rec.reveals.push(target);
    };
  });
});

test.afterAll(async () => {
  if (app) {
    await app.close();
  }
});

test("the menus carry the native shortcuts", async () => {
  const items = await app.evaluate(({ Menu }) => {
    const out: Record<string, string> = {};

    const walk = (menu: Electron.Menu | null | undefined, top: string) => {
      for (const item of menu?.items ?? []) {
        const key = item.id || item.role || item.label;
        out[`${top}/${key}`] = item.accelerator ?? "";
        walk(item.submenu, top || item.label);
      }
    };

    walk(Menu.getApplicationMenu(), "");

    return out;
  });

  expect.soft(items).toMatchObject({
    "Edit/redo": "Shift+CmdOrCtrl+Z",
    "Edit/undo": "CmdOrCtrl+Z",
    "File/new-project": "CmdOrCtrl+N",
    "File/open-folder": "CmdOrCtrl+O",
    "Run/run": "CmdOrCtrl+Enter",
    "Run/stop": "CmdOrCtrl+.",
    "View/zoom-actual": "CmdOrCtrl+0",
    "View/zoom-fit": "CmdOrCtrl+1",
    "View/zoom-in": "CmdOrCtrl+=",
    "View/zoom-out": "CmdOrCtrl+-",
    "View/zoom-selection": "CmdOrCtrl+2",
  });
  expect
    .soft(Object.keys(items))
    .toEqual(
      expect.arrayContaining([
        "File/recentdocuments",
        "File/reveal-work-tree",
        "File/reveal-export",
      ])
    );
  expect
    .soft(
      Object.keys(items).filter((key) =>
        /\/(zoomin|zoomout|resetzoom)$/.test(key)
      )
    )
    .toEqual([]);
});

async function canvasZoom(): Promise<number> {
  const transform = await page
    .locator(".artboard")
    .evaluate((el) => (el as HTMLElement).style.transform);

  return Number(/scale\(([\d.]+)\)/.exec(transform)?.[1] ?? Number.NaN);
}

function studioZoomFactor(): Promise<number> {
  return app.evaluate(({ BrowserWindow }, studioOrigin) => {
    const win = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().startsWith(studioOrigin)
    );

    if (!win) {
      throw new Error("no studio window");
    }
    return win.webContents.getZoomFactor();
  }, origin);
}

test("r2-1: zoom keys and View menu zoom the canvas, never the page", async () => {
  const folder = site("zoom folder");
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [chosen],
    })) as unknown as typeof dialog.showOpenDialog;
  }, folder);
  await clickMenu("open-folder");
  await expect.poll(openedProjectName).toContain("zoom folder");
  const frame = page.frameLocator("iframe.frame.front");
  await expect.soft(frame.locator("h1")).toHaveText("zoom folder");
  const seen: Record<string, number[]> = {};

  for (const where of ["studio", "frame"] as const) {
    if (where === "studio") {
      await page.evaluate(() =>
        (document.activeElement as HTMLElement | null)?.blur()
      );
    } else {
      await frame.locator("h1").click();
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.tagName))
        .toBe("IFRAME");
    }

    await page.keyboard.press("Meta+Digit0");
    await expect.poll(canvasZoom).toBe(1);
    await page.keyboard.press("Meta+Equal");
    await expect.poll(canvasZoom).toBeCloseTo(1.25, 4);
    await page.keyboard.press("Meta+Minus");
    await expect.poll(canvasZoom).toBeCloseTo(1, 4);
    await page.keyboard.press("Meta+Minus");
    await expect.poll(canvasZoom).toBeCloseTo(0.8, 4);
    await page.evaluate(() => {
      const artboard = document.querySelector<HTMLElement>(".artboard");
      const before = artboard?.style.transform ?? "";
      const w = window as unknown as { __fitPainted?: Promise<number> };
      w.__fitPainted = new Promise((resolve) => {
        const onSignal = (e: Event) => {
          const isFitKey =
            e instanceof KeyboardEvent && e.code === "Digit1" && e.shiftKey;

          const isFitMessage =
            e instanceof MessageEvent &&
            (e.data as { type?: string; key?: string } | null)?.type ===
              "zoom-key" &&
            (e.data as { key?: string }).key === "fit";

          if (!isFitKey && !isFitMessage) {
            return;
          }
          window.removeEventListener("keydown", onSignal, true);
          window.removeEventListener("message", onSignal, true);
          queueMicrotask(() =>
            requestAnimationFrame(() =>
              resolve(
                (artboard?.style.transform ?? "") === before ? -1 : Date.now()
              )
            )
          );
        };

        window.addEventListener("keydown", onSignal, true);
        window.addEventListener("message", onSignal, true);
      });
    });

    const keyFrame =
      where === "studio"
        ? page.mainFrame()
        : page.frames().find((f) => f.parentFrame() === page.mainFrame());

    await keyFrame?.evaluate(() =>
      window.addEventListener(
        "keydown",
        (e) => {
          if (e.code === "Digit1") {
            (window as unknown as { __fitKey: number }).__fitKey = Date.now();
          }
        },
        { capture: true }
      )
    );
    await page.keyboard.press("Shift+Digit1");

    const painted = await page.evaluate(
      () =>
        (window as unknown as { __fitPainted: Promise<number> }).__fitPainted
    );

    const pressed =
      (await keyFrame?.evaluate(
        () => (window as unknown as { __fitKey?: number }).__fitKey ?? 0
      )) ?? 0;

    expect.soft(painted).toBeGreaterThan(0);
    expect.soft(painted - pressed).toBeLessThanOrEqual(34.4);
    await expect
      .soft(page.getByLabel("Zoom", { exact: true }))
      .toHaveValue("fit");
    seen[where] = [
      await canvasZoom(),
      await studioZoomFactor(),
      painted - pressed,
    ];
    expect.soft(await studioZoomFactor()).toBe(1);
  }

  await clickMenu("zoom-actual");
  await expect.poll(canvasZoom).toBe(1);
  await clickMenu("zoom-in");
  await expect.poll(canvasZoom).toBeCloseTo(1.25, 4);
  await clickMenu("zoom-out");
  await expect.poll(canvasZoom).toBeCloseTo(1, 4);
  await clickMenu("zoom-fit");
  await expect
    .soft(page.getByLabel("Zoom", { exact: true }))
    .toHaveValue("fit");
  expect.soft(await studioZoomFactor()).toBe(1);
  console.log(`R2-1 desktop ${JSON.stringify(seen)}`);
});

test("open Folder imports a folder, opens it, and records it as recent", async () => {
  const folder = site("menu folder");
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [chosen],
    })) as unknown as typeof dialog.showOpenDialog;
  }, folder);
  await clickMenu("open-folder");
  await expect.poll(openedProjectName).toContain("menu folder");
  const projects = await call<Project[]>("GET", "/api/projects");
  expect
    .soft(projects.filter((project) => project.imported?.sourcePath === folder))
    .toHaveLength(1);
  await expect
    .poll(async () => (await recorded()).recents.map((entry) => entry.folder))
    .toContain(folder);

  const recents = JSON.parse(
    readFileSync(path.join(userData, "recent-projects.json"), "utf-8")
  ) as { folder: string }[];

  expect.soft(recents[0]?.folder).toBe(folder);

  await clickMenu("new-project");
  await expect
    .soft(page.getByRole("heading", { name: "New project" }))
    .toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.getAttribute("aria-label"))
    )
    .toBe("Describe the design");
  await clickMenu("open-folder");
  await expect.poll(openedProjectName).toContain("menu folder");
  expect
    .soft(
      (await call<Project[]>("GET", "/api/projects")).filter(
        (project) => project.imported?.sourcePath === folder
      )
    )
    .toHaveLength(1);
});

test("a folder dropped on the Dock (open-file) is imported; files and relative paths are ignored", async () => {
  const folder = site("dock folder");
  await clickMenu("new-project");
  await expect
    .soft(page.getByRole("heading", { name: "New project" }))
    .toBeVisible();
  const before = (await recorded()).commands.length;
  await app.evaluate(
    ({ app: electronApp }, args) => {
      const event = { preventDefault: () => {} };
      electronApp.emit("open-file", event, args.file);
      electronApp.emit("open-file", event, "relative/folder");
      electronApp.emit("open-file", event, args.folder);
    },
    { file: path.join(folder, "index.html"), folder }
  );
  await expect.poll(openedProjectName).toContain("dock folder");
  expect
    .soft((await recorded()).commands.slice(before))
    .toEqual([{ path: folder, type: "open-folder" }]);
});

test("designstudio://open deep links open the project; bad links are dropped; a second instance forwards its link", async () => {
  const projects = await call<Project[]>("GET", "/api/projects");

  const first = projects.find((project) =>
    project.name.includes("menu folder")
  );

  const second = projects.find((project) =>
    project.name.includes("dock folder")
  );

  if (!first || !second) {
    throw new Error("projects missing");
  }
  await clickMenu("new-project");
  await expect
    .soft(page.getByRole("heading", { name: "New project" }))
    .toBeVisible();
  const before = (await recorded()).commands.length;
  await app.evaluate(
    ({ app: electronApp }, ids) => {
      const event = { preventDefault: () => {} };
      electronApp.emit(
        "open-url",
        event,
        "designstudio://open?project=../../etc"
      );
      electronApp.emit("open-url", event, "https://example.com/open?project=x");
      electronApp.emit(
        "open-url",
        event,
        `designstudio://open?project=${ids.first}`
      );
    },
    { first: first.id }
  );
  await expect.poll(openedProjectName).toContain("menu folder");
  expect
    .soft((await recorded()).commands.slice(before))
    .toEqual([{ projectId: first.id, type: "open-project" }]);
  await app.evaluate(({ app: electronApp }, id) => {
    electronApp.emit(
      "second-instance",
      {},
      [
        "/Applications/Design Studio.app/Contents/MacOS/Design Studio",
        `designstudio://open?project=${id}`,
      ],
      "/"
    );
  }, second.id);
  await expect.poll(openedProjectName).toContain("dock folder");
});

test("undo goes to the text field when typing and to version undo on the canvas", async () => {
  await clickMenu("new-project");
  await page.getByLabel("Describe the design").fill("Native undo check");
  await page.getByRole("radio", { name: "HTML" }).click();
  await clickCreate(page);
  await expect.soft(page.locator(".topbar")).toBeVisible();

  const project = (await call<Project[]>("GET", "/api/projects")).find((item) =>
    item.name.includes("Native undo check")
  );

  const main = project?.directions[0];

  if (!project || !main) {
    throw new Error("project missing");
  }
  await expect.poll(() => finished(project.id), { timeout: 60_000 }).toBe(1);
  await call("POST", `/api/projects/${project.id}/d/${main.id}/runs`, {
    mode: "edit",
    prompt: "Make the headline bolder",
  });
  await expect.poll(() => finished(project.id), { timeout: 60_000 }).toBe(2);

  const versions = () =>
    call<Version[]>("GET", `/api/projects/${project.id}/d/${main.id}/versions`);

  await expect
    .poll(async () => (await versions()).length)
    .toBeGreaterThanOrEqual(2);
  const count = (await versions()).length;

  const box = page.getByPlaceholder("Describe a change");
  await box.click();
  await page.keyboard.type("abc");
  await clickMenu("undo");
  await expect.poll(() => box.inputValue()).not.toBe("abc");
  expect.soft(await versions()).toHaveLength(count);

  await box.fill("");
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur()
  );
  await clickMenu("undo");
  await expect.poll(async () => (await versions())[0]?.meta.kind).toBe("undo");
});

test("run sends the draft, Stop cancels the run, and a background finish notifies", async () => {
  const project = (await call<Project[]>("GET", "/api/projects")).find((item) =>
    item.name.includes("Native undo check")
  );

  if (!project) {
    throw new Error("project missing");
  }
  const done = await finished(project.id);
  await page
    .getByPlaceholder("Describe a change")
    .fill("Make it calmer [slow]");
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur()
  );
  await clickMenu("run");
  await expect
    .poll(async () =>
      (
        await call<RunSummary[]>("GET", `/api/projects/${project.id}/runs`)
      ).some((run) => run.status === "running")
    )
    .toBe(true);
  await expect
    .poll(() =>
      app.evaluate(
        ({ Menu }) =>
          Menu.getApplicationMenu()?.getMenuItemById("stop")?.enabled
      )
    )
    .toBe(true);
  await clickMenu("stop");
  await expect
    .poll(
      async () =>
        (
          await call<RunSummary[]>("GET", `/api/projects/${project.id}/runs`)
        ).filter((run) => run.status === "canceled").length
    )
    .toBe(1);
  expect
    .soft(
      (await recorded()).notices.filter(
        (notice) => notice.status === "canceled"
      )
    )
    .toEqual([]);

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((window) => window.isVisible())
      ?.minimize()
  );
  const main = project.directions[0];

  if (!main) {
    throw new Error("no direction");
  }
  await call("POST", `/api/projects/${project.id}/d/${main.id}/runs`, {
    mode: "edit",
    prompt: "Background finish",
  });
  await expect
    .poll(() => finished(project.id), { timeout: 60_000 })
    .toBe(done + 2);

  const background = async () =>
    (await recorded()).notices.filter((item) =>
      item.body.includes("Background finish")
    );

  await expect.poll(async () => (await background()).length).toBe(1);
  const [notice] = await background();
  expect.soft(notice).toMatchObject({
    projectId: project.id,
    status: "completed",
    title: "Run finished",
  });
  expect.soft(notice?.body).toContain("Background finish");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((window) => window.isMinimized())
      ?.restore()
  );
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((window) => window.isMinimized())
      )
    )
    .toBe(false);
});

test("reveal in Finder shows the work tree in the default projects folder and the last export", async () => {
  const project = (await call<Project[]>("GET", "/api/projects")).find((item) =>
    item.name.includes("Native undo check")
  );

  const main = project?.directions[0];

  if (!project || !main) {
    throw new Error("project missing");
  }
  await clickMenu("reveal-work-tree");
  await expect
    .poll(async () => (await recorded()).reveals)
    .toContain(main.workTree);
  expect
    .soft(main.workTree.startsWith(path.join(work, "Design Studio") + path.sep))
    .toBe(true);

  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(["zip bytes"], { type: "application/zip" })
    );
    link.download = "export check.zip";
    link.click();
  });
  await expect.poll(async () => (await recorded()).exports.length).toBe(1);
  const [exported] = (await recorded()).exports;
  expect.soft(exported).toBe(path.join(work, "downloads", "export check.zip"));
  expect.soft(existsSync(exported ?? "")).toBe(true);
  await clickMenu("reveal-export");
  await expect.poll(async () => (await recorded()).reveals).toContain(exported);
});

test("r3-2: Esc in the desktop window stops a run, with focus in the studio and in the preview", async () => {
  const accelerators = await app.evaluate(({ Menu }) => {
    const out: string[] = [];

    const walk = (items: Electron.MenuItem[]) => {
      for (const item of items) {
        if (item.accelerator) {
          out.push(String(item.accelerator));
        }
        if (item.submenu) {
          walk(item.submenu.items);
        }
      }
    };

    walk(Menu.getApplicationMenu()?.items ?? []);

    return out;
  });

  expect
    .soft(accelerators.filter((key) => /^(Esc|Escape)$/i.test(key)))
    .toEqual([]);
  const round = test.info().repeatEachIndex;

  const openFresh = async (name: string) => {
    const folder = site(name);
    await app.evaluate(({ dialog }, chosen) => {
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [chosen],
      })) as unknown as typeof dialog.showOpenDialog;
    }, folder);
    await clickMenu("open-folder");
    await expect.poll(openedProjectName).toContain(name);

    const project = (await call<Project[]>("GET", "/api/projects")).find(
      (item) => item.imported?.sourcePath === folder
    );

    const main = project?.directions[0];

    if (!project || !main) {
      throw new Error(`${name} project missing`);
    }
    return { main, project };
  };

  const stopsWithin = async (
    project: Project,
    runId: string,
    press: () => Promise<void>
  ) => {
    const card = page.locator(`[data-run-id="${runId}"]`);
    await expect
      .soft(card.locator('.tool-row[data-state="done"]').first())
      .toBeVisible({ timeout: 20_000 });
    await press();
    await expect.soft(card.locator(".run-foot .status.canceled")).toBeVisible({
      timeout: 2000,
    });
    await expect
      .poll(
        async () =>
          (
            await call<RunSummary[]>("GET", `/api/projects/${project.id}/runs`)
          ).find((run) => run.id === runId)?.status
      )
      .toBe("canceled");
  };

  const studio = await openFresh(`esc studio ${round}`);
  const box = page.getByPlaceholder("Describe a change");
  await box.fill("Desktop Esc studio [steps]");

  const sent = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/d/${studio.main.id}/runs`)
  );

  await box.press("Meta+Enter");
  const { runId: studioRun } = (await (await sent).json()) as { runId: string };
  await stopsWithin(studio.project, studioRun, async () => {
    await box.focus();
    await page.keyboard.press("Escape");
  });

  const preview = await openFresh(`esc preview ${round}`);
  const frame = page.frameLocator("iframe.frame.front");
  await expect.soft(frame.locator("h1")).toHaveText(`esc preview ${round}`);
  await frame.locator("h1").click();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .toBe("IFRAME");

  const { runId: previewRun } = await call<{ runId: string }>(
    "POST",
    `/api/projects/${preview.project.id}/d/${preview.main.id}/runs`,
    { mode: "edit", prompt: "Desktop Esc preview [steps]" }
  );

  await stopsWithin(preview.project, previewRun, async () => {
    expect
      .soft(await page.evaluate(() => document.activeElement?.tagName))
      .toBe("IFRAME");
    await page.keyboard.press("Escape");
  });
});

test("window bounds are saved per display layout", async () => {
  const file = path.join(userData, "window-state.json");
  await expect
    .poll(async () => {
      await app.evaluate(({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows().find(
          (candidate) => candidate.isVisible() && !candidate.isMinimized()
        );

        if (window && window.getNormalBounds().width !== 1100) {
          window.setBounds({ x: 40, y: 60, width: 1100, height: 760 });
        }
      });

      if (!existsSync(file)) {
        return null;
      }
      const state = JSON.parse(readFileSync(file, "utf-8")) as {
        last: string;
        layouts: Record<string, { bounds: { width: number } }>;
      };

      return state.layouts[state.last]?.bounds.width ?? null;
    })
    .toBe(1100);

  const key = (JSON.parse(readFileSync(file, "utf-8")) as { last: string })
    .last;

  expect.soft(key).toMatch(/^\d+:-?\d+,-?\d+,\d+x\d+/);
});

test("the app uses the native folder dialog for Location and Open Folder, attached to the studio window", async () => {
  const parent = path.join(work, "picked parent");
  mkdirSync(parent, { recursive: true });
  const realParent = realpathSync(parent);
  const menuSite = site("menu picked site");

  interface DialogCall {
    parented: boolean;
    title: string | null;
    properties: string[];
    defaultPath: string | null;
  }
  await app.evaluate(
    ({ dialog, BrowserWindow }, answers) => {
      const calls: DialogCall[] = [];
      const queue = [...answers];
      (globalThis as unknown as { __dialogCalls: DialogCall[] }).__dialogCalls =
        calls;
      dialog.showOpenDialog = (async (
        first: unknown,
        second?: Electron.OpenDialogOptions
      ) => {
        const options = (second ?? first) as Electron.OpenDialogOptions;
        calls.push({
          defaultPath: options.defaultPath ?? null,
          parented: first instanceof BrowserWindow,
          properties: options.properties ?? [],
          title: options.title ?? null,
        });

        return { canceled: false, filePaths: [queue.shift() ?? ""] };
      }) as unknown as typeof dialog.showOpenDialog;
    },
    [realParent, menuSite]
  );

  const dialogCalls = () =>
    app.evaluate(
      () =>
        (globalThis as unknown as { __dialogCalls: DialogCall[] }).__dialogCalls
    );

  await clickMenu("new-project");
  await expect
    .soft(page.getByRole("heading", { name: "New project" }))
    .toBeVisible();
  await page.getByLabel("Describe the design").fill("Desktop folder page");
  await page.getByLabel("Location").selectOption({ label: "Choose folder…" });
  await expect.soft(page.getByLabel("Location")).toHaveValue(realParent);
  const [locationCall] = await dialogCalls();
  expect.soft(locationCall).toMatchObject({
    parented: true,
    title: "Choose where to save the new project",
  });
  expect
    .soft(locationCall?.properties)
    .toEqual(expect.arrayContaining(["openDirectory", "createDirectory"]));

  await clickCreate(page);
  await expect.poll(openedProjectName).toContain("Desktop folder page");

  const created = (await call<Project[]>("GET", "/api/projects")).find(
    (project) => project.name === "Desktop folder page"
  );

  expect.soft(created?.imported).toEqual({
    created: true,
    sourcePath: path.join(realParent, "desktop-folder-page"),
  });
  await expect.poll(() => finished(created!.id), { timeout: 60_000 }).toBe(1);

  await clickMenu("open-folder");
  await expect.poll(openedProjectName).toContain("menu picked site");
  const calls = await dialogCalls();
  expect.soft(calls).toHaveLength(2);
  expect.soft(calls[1]).toMatchObject({ parented: true, title: "Open Folder" });
  expect
    .soft(calls[1]?.properties)
    .toEqual(expect.arrayContaining(["openDirectory", "createDirectory"]));
  expect
    .soft(
      (await call<Project[]>("GET", "/api/projects")).filter(
        (project) => project.imported?.sourcePath === menuSite
      )
    )
    .toHaveLength(1);
});
