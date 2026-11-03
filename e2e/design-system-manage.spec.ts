import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { PackSummary, Project } from "../src/shared/contracts";
import { openHome } from "./support/studio";
import type { StudioApi } from "./support/studio";

const SHOTS = process.env.STUDIO_DS4_SHOTS ?? "";

async function removePacksNamed(api: StudioApi, name: string): Promise<void> {
  const packs = await api.call<PackSummary[]>("GET", "/api/packs");

  for (const pack of packs.filter(
    (item) =>
      item.source === "user" &&
      (item.name === name || item.name.startsWith("Modern Minimal copy"))
  )) {
    await api.call("DELETE", `/api/packs/${pack.id}`);
  }
}

async function setUi(
  page: Page,
  patch: Record<string, unknown>
): Promise<void> {
  await page.evaluate((next) => {
    const raw = localStorage.getItem("design-studio.ui.v1");
    localStorage.setItem(
      "design-studio.ui.v1",
      JSON.stringify({ ...(raw ? JSON.parse(raw) : {}), ...next })
    );
  }, patch);
  await page.reload();
}

const yours = (page: Page) => page.getByRole("region", { name: /^Yours/ });

const detail = (page: Page, name: string) =>
  page.getByRole("dialog", { exact: true, name: `${name} design system` });

async function shot(page: Page, file: string): Promise<void> {
  if (!SHOTS) {
    return;
  }

  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({
    animations: "disabled",
    path: path.join(SHOTS, file),
  });
}

test("design systems screen: copy, rename, export, delete, import, open in editor, use and apply", async ({
  page,
}, testInfo) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort()
  );
  const api = await openHome(page);
  const NAME = `Ledger ${Date.now().toString(36)}`;
  await removePacksNamed(api, NAME);

  await page
    .getByRole("button", { exact: true, name: "Design systems" })
    .click();
  await expect
    .soft(page.getByRole("heading", { level: 1, name: "Design systems" }))
    .toBeVisible();
  const builtin = page.getByRole("region", { name: /^Built-in/ });
  await expect.soft(builtin.getByRole("button")).toHaveCount(8);
  await shot(page, "library.png");

  await builtin
    .getByRole("button", { exact: true, name: "Modern Minimal" })
    .click();
  const original = detail(page, "Modern Minimal");
  await expect.soft(original.getByText("Check passed")).toBeVisible();
  await expect
    .soft(original.getByRole("region", { name: "Light" }))
    .toBeVisible();
  await expect
    .soft(original.getByRole("region", { name: "Dark" }))
    .toBeVisible();
  await expect
    .soft(original.getByRole("button", { exact: true, name: "Delete" }))
    .toHaveCount(0);
  await shot(page, "detail.png");

  if (SHOTS) {
    await original
      .getByRole("region", { name: "Check" })
      .scrollIntoViewIfNeeded();
    await shot(page, "detail-check.png");
  }

  await original.getByRole("button", { name: "Make a copy to edit" }).click();

  const copy = detail(page, "Modern Minimal copy");
  await expect.soft(copy).toBeVisible();
  await expect.soft(copy.getByText("Copy", { exact: true })).toBeVisible();
  await copy.getByRole("button", { name: "Rename" }).click();
  const rename = page.getByRole("dialog", { name: "Rename design system" });
  await rename.getByLabel("Design system name").fill(NAME);
  await rename.getByRole("button", { exact: true, name: "Rename" }).click();
  const renamed = detail(page, NAME);
  await expect.soft(renamed).toBeVisible();

  const packId = (await api.call<PackSummary[]>("GET", "/api/packs")).find(
    (pack) => pack.name === NAME
  )!.id;

  const downloadEvent = page.waitForEvent("download");
  await renamed.getByRole("button", { name: "Export" }).click();
  const download = await downloadEvent;
  expect.soft(download.suggestedFilename()).toBe(`${packId}.zip`);
  const zip = testInfo.outputPath(`${packId}.zip`);
  await download.saveAs(zip);

  await renamed.getByRole("button", { exact: true, name: "Delete" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete design system" });
  await expect
    .soft(confirm.getByText("Projects that use it keep their files."))
    .toBeVisible();
  await confirm.getByRole("button", { exact: true, name: "Delete" }).click();
  await expect.soft(page.getByText(`Deleted ${NAME}.`)).toBeVisible();
  await expect
    .soft(yours(page).getByRole("button", { exact: true, name: NAME }))
    .toHaveCount(0);

  await page.getByLabel("Design system zip").setInputFiles(zip);
  const imported = detail(page, NAME);
  await expect.soft(imported).toBeVisible();
  await expect
    .soft(imported.getByText("Imported", { exact: true }))
    .toBeVisible();
  await expect.soft(page.getByText(`Imported ${NAME}.`)).toBeVisible();
  await imported.getByRole("button", { name: "Close design system" }).click();

  await page.getByLabel("Design system zip").setInputFiles(zip);

  const conflict = page.getByRole("dialog", {
    name: "Design system already in your library",
  });

  await expect
    .soft(
      conflict.getByRole("heading", {
        name: `${NAME} is already in your library`,
      })
    )
    .toBeVisible();
  await conflict.getByRole("button", { name: "Keep both" }).click();
  await detail(page, NAME)
    .getByRole("button", { name: "Close design system" })
    .click();
  await expect
    .soft(yours(page).getByRole("button", { exact: true, name: NAME }))
    .toHaveCount(2);
  await shot(page, "library-yours.png");

  await yours(page)
    .getByRole("button", { exact: true, name: NAME })
    .first()
    .click();
  await detail(page, NAME)
    .getByRole("button", { name: "Open in editor" })
    .click();
  await expect.soft(page.locator(".topbar")).toBeVisible();
  await expect
    .soft(page.getByRole("region", { name: "Design system draft" }))
    .toBeVisible();

  const ids = (await api.call<PackSummary[]>("GET", "/api/packs"))
    .filter((pack) => pack.name === NAME)
    .map((pack) => pack.id);

  expect.soft(ids).toHaveLength(2);

  const backing = (await api.projects()).find(
    (project) => project.name === `${NAME} design system`
  );

  expect.soft(ids).toContain(backing?.designSystemFor);
  const editorPack = backing!.designSystemFor!;

  await setUi(page, { activeProjectId: null, screen: "design-systems" });
  await yours(page)
    .getByRole("button", { exact: true, name: NAME })
    .first()
    .click();
  await detail(page, NAME)
    .getByRole("button", { name: "Open in editor" })
    .click();
  await expect.soft(page.locator(".topbar")).toBeVisible();
  expect
    .soft(
      (await api.projects()).filter(
        (project) => project.designSystemFor === editorPack
      )
    )
    .toHaveLength(1);

  await setUi(page, { activeProjectId: null, screen: "design-systems" });
  await yours(page)
    .getByRole("button", { exact: true, name: NAME })
    .first()
    .click();
  await detail(page, NAME)
    .getByRole("button", { name: "Use in new project" })
    .click();
  await expect
    .soft(page.getByRole("heading", { name: "New project" }))
    .toBeVisible();
  await expect
    .soft(page.getByRole("button", { exact: true, name: "Design system" }))
    .toContainText(NAME);

  const { project } = await api.call<{ project: Project }>(
    "POST",
    "/api/projects",
    {
      kind: "html",
      packId: "editorial",
      prompt: "Manage target",
      startRun: false,
    }
  );

  await setUi(page, { activeProjectId: project.id });
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Design system: Editorial" })
    .click();
  await page
    .getByRole("dialog", { name: "Design system" })
    .getByRole("button", { name: "Change design system…" })
    .click();
  await page.getByRole("button", { name: "Manage…" }).click();
  await expect
    .soft(page.getByRole("heading", { level: 1, name: "Design systems" }))
    .toBeVisible();
  await yours(page)
    .getByRole("button", { exact: true, name: NAME })
    .first()
    .click();
  await detail(page, NAME)
    .getByRole("button", { name: "Apply to current project" })
    .click();
  await expect
    .soft(
      page
        .locator(".topbar")
        .getByRole("button", { name: `Design system: ${NAME}` })
    )
    .toBeVisible();
  expect.soft(ids).toContain((await api.project(project.id)).packId);

  await removePacksNamed(api, NAME);
});
