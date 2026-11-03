import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { Project } from "../src/shared/contracts";
import type { WorkspaceFolder, WorkspaceList } from "../src/shared/folders";
import { projectsDirFor, readState, ROOT } from "./support/server";
import { openHome, clickCreate } from "./support/studio";
import type { StudioApi } from "./support/studio";

const SHOTS = process.env.STUDIO_FOLDERS_SHOTS === "1";
const SHOT_DIR = path.join(ROOT, "design-review");

interface PickRequest {
  title?: string;
  defaultPath?: string;
}

function tempFolder(name: string): string {
  const base = path.join(readState().workDir, "folders");
  mkdirSync(base, { recursive: true });

  return realpathSync(mkdtempSync(path.join(base, `${name} `)));
}

async function stubPicker(
  page: Page,
  answer: (request: PickRequest) => { status: number; path?: string }
): Promise<PickRequest[]> {
  const seen: PickRequest[] = [];
  await page.route("**/api/pick-folder", async (route) => {
    const request = (route.request().postDataJSON() ?? {}) as PickRequest;
    seen.push(request);
    const reply = answer(request);

    if (reply.status === 204) {
      await route.fulfill({ body: "", status: 204 });
    } else if (reply.path) {
      await route.fulfill({ json: { path: reply.path }, status: 200 });
    } else {
      await route.fulfill({
        json: { error: "the folder picker needs macOS; paste a path instead" },
        status: reply.status,
      });
    }
  });

  return seen;
}

async function folders(api: StudioApi): Promise<WorkspaceFolder[]> {
  return (
    await api.call<WorkspaceList>("GET", "/api/workspaces")
  ).folders.filter((folder) => !folder.default);
}

async function forgetAllFolders(api: StudioApi): Promise<void> {
  for (const folder of await folders(api)) {
    await api.call("DELETE", `/api/workspaces/${folder.id}`);
  }
}

function folderRow(page: Page, label: string) {
  return page
    .locator(".folder-row")
    .filter({ has: page.locator(".folder-label", { hasText: label }) });
}

async function goHome(page: Page): Promise<void> {
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("button", { name: "Projects" })
    .click();
  await expect
    .soft(page.getByRole("heading", { name: "Start a new project" }))
    .toBeVisible();
}

async function shoot(
  page: Page,
  name: string,
  prepare?: () => Promise<void>
): Promise<void> {
  if (!SHOTS) {
    return;
  }

  for (const size of [
    { height: 900, width: 1440 },
    { height: 934, width: 800 },
  ]) {
    await page.setViewportSize(size);
    await prepare?.();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SHOT_DIR, `folders-${name}-${size.width}.png`),
    });
  }

  await page.setViewportSize({ height: 1000, width: 1600 });
}

test.describe.configure({ mode: "serial" });

test("create a project in a chosen folder: new subfolder only, listed under Folders, location remembered", async ({
  page,
}) => {
  const parent = tempFolder("Client Sites");
  writeFileSync(path.join(parent, "sibling.txt"), "keep\n");
  mkdirSync(path.join(parent, "folder-pricing-page"));
  writeFileSync(path.join(parent, "folder-pricing-page", "mine.txt"), "mine\n");
  const picks = await stubPicker(page, () => ({ path: parent, status: 200 }));
  const api = await openHome(page);
  await forgetAllFolders(api);
  await page.reload();

  await page.getByLabel("Describe the design").fill("Folder pricing page");
  await expect
    .soft(page.getByTestId("location-target"))
    .toContainText("Design Studio/folder-pricing-page");
  await page.getByLabel("Location").selectOption({ label: "Choose folder…" });
  await expect.soft(page.getByLabel("Location")).toHaveValue(parent);
  await expect
    .soft(page.getByTestId("location-target"))
    .toContainText("folder-pricing-page");
  expect.soft(picks).toHaveLength(1);
  await expect.soft(folderRow(page, path.basename(parent))).toBeVisible();
  await shoot(page, "location", async () => {
    await page.locator(".home").evaluate((home) => home.scrollTo({ top: 0 }));
  });

  const before = new Set((await api.projects()).map((project) => project.id));
  await clickCreate(page);
  await expect.soft(page.locator(".topbar")).toBeVisible();

  const project = (await api.projects()).find(
    (candidate) => !before.has(candidate.id)
  ) as Project;

  const folder = path.join(parent, "folder-pricing-page-2");
  expect.soft(project.imported).toEqual({ created: true, sourcePath: folder });
  expect.soft(project.directions[0]?.workTree).toBe(folder);
  expect
    .soft(readdirSync(parent).sort())
    .toEqual(["folder-pricing-page", "folder-pricing-page-2", "sibling.txt"]);
  expect
    .soft(readdirSync(path.join(parent, "folder-pricing-page")))
    .toEqual(["mine.txt"]);
  expect.soft(existsSync(path.join(folder, ".git"))).toBe(false);
  await api.waitForRuns(project.id, 1);
  expect.soft(existsSync(path.join(folder, "index.html"))).toBe(true);

  await goHome(page);
  await expect.soft(page.getByLabel("Location")).toHaveValue(parent);
  const row = folderRow(page, path.basename(parent));
  await expect.soft(row.locator(".folder-count")).toHaveText("1 project");
  await row.locator(".folder-main").click();
  await expect
    .soft(
      page.getByRole("heading", {
        name: `Projects in ${path.basename(parent)}`,
      })
    )
    .toBeVisible();
  await expect.soft(page.locator(".project-card")).toHaveCount(1);
  await expect
    .soft(page.locator(".project-card .project-name"))
    .toHaveText("Folder pricing page");
  await page.getByRole("button", { name: "Show all" }).click();
  await expect
    .soft(page.getByRole("heading", { name: "Recent projects" }))
    .toBeVisible();
});

test("open a folder from a saved folder through the picker, then rename and remove the saved folder", async ({
  page,
}) => {
  const parent = tempFolder("Work");
  const site = path.join(parent, "existing site");
  mkdirSync(site);
  writeFileSync(
    path.join(site, "index.html"),
    "<!doctype html><title>x</title><h1>Existing</h1>\n"
  );
  const api = await openHome(page);
  await forgetAllFolders(api);

  const saved = await api.call<WorkspaceFolder>("POST", "/api/workspaces", {
    path: parent,
  });

  const picks = await stubPicker(page, () => ({ path: site, status: 200 }));
  await page.reload();

  const row = folderRow(page, "Work");
  await expect.soft(row.locator(".folder-count")).toHaveText("0 projects");
  await row.getByRole("button", { name: "Open folder here…" }).click();
  await expect
    .soft(page.locator("form.open-folder .folder-path"))
    .toHaveAttribute("title", site);
  expect.soft(picks[0]?.defaultPath).toBe(parent);
  await page.getByRole("button", { exact: true, name: "Open" }).click();
  await expect.soft(page.locator(".topbar")).toBeVisible();

  const imported = (await api.projects()).filter(
    (project) => project.imported?.sourcePath === site
  );

  expect.soft(imported).toHaveLength(1);
  expect.soft(imported[0]?.imported?.created).toBeUndefined();

  await goHome(page);
  await expect.soft(row.locator(".folder-count")).toHaveText("1 project");
  await row.getByRole("button", { name: "Rename Work" }).click();
  await page.getByLabel("Name for Work").fill("Day job");
  await page.getByLabel("Name for Work").press("Enter");
  await expect.soft(folderRow(page, "Day job")).toBeVisible();
  expect
    .soft((await folders(api)).find((folder) => folder.id === saved.id)?.label)
    .toBe("Day job");

  await folderRow(page, "Day job")
    .getByRole("button", { name: "Remove Day job from the list" })
    .click();
  await expect.soft(folderRow(page, "Day job")).toHaveCount(0);
  expect.soft(await folders(api)).toEqual([]);
  expect.soft(existsSync(path.join(site, "index.html"))).toBe(true);
});

test("add folder: a canceled picker adds nothing, a picked folder is saved, a moved folder shows Missing", async ({
  page,
}) => {
  const parent = tempFolder("Moving");
  let answer: { status: number; path?: string } = { status: 204 };
  await stubPicker(page, () => answer);
  const api = await openHome(page);
  await forgetAllFolders(api);
  await page.reload();

  await page.getByRole("button", { name: "Add folder…" }).click();
  await expect.soft(page.locator(".home-folders-empty")).toBeVisible();
  expect.soft(await folders(api)).toEqual([]);

  answer = { path: parent, status: 200 };
  await page.getByRole("button", { name: "Add folder…" }).click();
  await expect.soft(folderRow(page, "Moving")).toBeVisible();
  expect
    .soft((await folders(api)).map((folder) => folder.path))
    .toEqual([parent]);

  const other = tempFolder("Design Archive");
  await api.call("POST", "/api/workspaces", { path: other });

  const created = await api.call<{ project: Project }>(
    "POST",
    "/api/projects",
    {
      kind: "html",
      parentPath: other,
      prompt: "Archive landing",
      startRun: false,
    }
  );

  expect
    .soft(path.dirname(created.project.imported?.sourcePath ?? ""))
    .toBe(other);
  await page.reload();
  await shoot(page, "home", async () => {
    await page.locator("#folders-heading").scrollIntoViewIfNeeded();
    await page.locator(".home").evaluate((home) => {
      const heading = home.querySelector("#folders-heading");

      if (heading) {
        home.scrollTo({ top: (heading as HTMLElement).offsetTop - 24 });
      }
    });
  });

  renameSync(parent, `${parent} moved`);
  await page.reload();
  await expect
    .soft(folderRow(page, "Moving").getByText("Missing"))
    .toBeVisible();
  await expect
    .soft(
      folderRow(page, "Moving").getByRole("button", {
        name: "New project here",
      })
    )
    .toBeDisabled();
  await expect
    .soft(page.getByLabel("Location").locator("option", { hasText: "Moving" }))
    .toHaveCount(0);
  await forgetAllFolders(api);
});

test("off macOS the picker falls back to pasting a path", async ({ page }) => {
  await stubPicker(page, () => ({ status: 501 }));
  await openHome(page);
  await page.getByRole("button", { name: "Choose folder…" }).click();
  await expect
    .soft(page.getByText("The folder picker needs macOS. Paste the full path."))
    .toBeVisible();
  await expect
    .soft(page.getByPlaceholder("/Users/me/projects/site"))
    .toBeVisible();
  await expect
    .soft(page.getByRole("button", { name: "Choose folder…" }))
    .toHaveCount(0);
});

test("create with no location: a readable folder in the default Design Studio folder", async ({
  page,
}) => {
  const api = await openHome(page);
  const row = folderRow(page, "Design Studio");
  await expect.soft(row.locator(".folder-default")).toHaveText("Default");
  await expect
    .soft(row.getByRole("button", { name: /^Remove/ }))
    .toHaveCount(0);
  await expect.soft(page.getByLabel("Location")).toHaveValue("default");

  const countBefore = Number(
    (await row.locator(".folder-count").textContent())?.split(" ")[0]
  );

  await page.getByLabel("Describe the design").fill("Default folder landing");
  await expect
    .soft(page.getByTestId("location-target"))
    .toContainText("Design Studio/default-folder-landing");
  const before = new Set((await api.projects()).map((project) => project.id));
  await clickCreate(page);
  await expect.soft(page.locator(".topbar")).toBeVisible();

  const project = (await api.projects()).find(
    (candidate) => !before.has(candidate.id)
  ) as Project;

  const folder = path.join(
    realpathSync(projectsDirFor(readState().dataDir)),
    "default-folder-landing"
  );

  expect.soft(project.imported).toEqual({ created: true, sourcePath: folder });
  expect.soft(project.directions[0]?.workTree).toBe(folder);
  await api.waitForRuns(project.id, 1);
  expect.soft(existsSync(path.join(folder, "index.html"))).toBe(true);

  await goHome(page);
  const countAfter = countBefore + 1;
  await expect
    .soft(row.locator(".folder-count"))
    .toHaveText(`${countAfter} project${countAfter === 1 ? "" : "s"}`);
  await row.locator(".folder-main").click();
  await expect
    .soft(page.getByRole("heading", { name: "Projects in Design Studio" }))
    .toBeVisible();
  await expect
    .soft(
      page.locator(".project-card .project-name", {
        hasText: "Default folder landing",
      })
    )
    .toBeVisible();
});

test("hidden projects move to the default folder only when the user clicks Move", async ({
  page,
}) => {
  const api = await openHome(page);

  const { project: source } = await api.call<{ project: Project }>(
    "POST",
    "/api/projects",
    { kind: "html", prompt: "Hidden source page", startRun: false }
  );

  const { dataDir } = readState();
  const id = `hidden${Date.now().toString(36)}`;
  const projectDir = path.join(dataDir, "projects", id);
  const workTree = path.join(projectDir, "directions", "main");
  cpSync(path.join(dataDir, "projects", source.id), projectDir, {
    recursive: true,
  });
  mkdirSync(workTree, { recursive: true });
  writeFileSync(
    path.join(workTree, "index.html"),
    "<!doctype html><title>x</title><h1>Old hidden</h1>\n"
  );

  const stored = JSON.parse(
    readFileSync(path.join(projectDir, "project.json"), "utf-8")
  ) as Project;

  const hidden: Project = {
    ...stored,
    directions: stored.directions.map((direction) => ({
      ...direction,
      workTree,
      headVersionId: null,
    })),
    id,
    imported: null,
    name: "Old hidden page",
  };

  writeFileSync(
    path.join(projectDir, "project.json"),
    JSON.stringify(hidden, null, 2)
  );
  await page.reload();

  const note = page.locator(".home-hidden-note");
  await expect
    .soft(note)
    .toContainText("1 project is in the app's hidden folder");
  expect
    .soft(readFileSync(path.join(workTree, "index.html"), "utf-8"))
    .toContain("Old hidden");
  await note.getByRole("button", { name: /^Move to / }).click();
  await expect.soft(note).toHaveCount(0);

  const folder = path.join(
    realpathSync(projectsDirFor(dataDir)),
    "old-hidden-page"
  );

  const moved = await api.call<Project>("GET", `/api/projects/${id}`);
  expect.soft(moved.directions[0]?.workTree).toBe(folder);
  expect.soft(moved.imported).toEqual({ created: true, sourcePath: folder });
  expect
    .soft(readFileSync(path.join(folder, "index.html"), "utf-8"))
    .toContain("Old hidden");
  expect.soft(existsSync(workTree)).toBe(false);
  await folderRow(page, "Design Studio").locator(".folder-main").click();
  await expect
    .soft(
      page.locator(".project-card .project-name", {
        hasText: "Old hidden page",
      })
    )
    .toBeVisible();
});
