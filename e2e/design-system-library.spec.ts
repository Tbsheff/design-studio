import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { PackSummary, Project } from "../src/shared/contracts";
import {
  frontFrame,
  mainDirection,
  openHome,
  showVersions,
  versionRow,
} from "./support/studio";
import type { StudioApi } from "./support/studio";

async function openProject(
  page: Page,
  api: StudioApi,
  body: Record<string, unknown>
): Promise<Project> {
  const { project } = await api.call<{ project: Project }>(
    "POST",
    "/api/projects",
    { kind: "html", ...body }
  );

  if (body.startRun !== false) {
    await api.waitForRuns(project.id, 1);
  }

  await page.evaluate((id) => {
    const raw = localStorage.getItem("design-studio.ui.v1");
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      "design-studio.ui.v1",
      JSON.stringify({ ...state, activeProjectId: id })
    );
  }, project.id);
  await page.reload();
  await expect.soft(page.locator(".topbar")).toBeVisible();

  return api.project(project.id);
}

function chip(page: Page, name: string) {
  return page
    .locator(".topbar")
    .getByRole("button", { name: `Design system: ${name}` });
}

async function deleteUserPackIfPresent(
  api: StudioApi,
  id: string
): Promise<void> {
  const packs = await api.call<PackSummary[]>("GET", "/api/packs");

  if (packs.some((pack) => pack.id === id)) {
    await api.call("DELETE", `/api/packs/${id}`);
  }
}

async function previewPrimary(page: Page): Promise<string> {
  return (
    await frontFrame(page)
      .locator("html")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--primary"))
  ).trim();
}

async function expectPreviewPrimary(
  page: Page,
  check: (primary: string) => void
): Promise<string> {
  let primary = "";
  await expect
    .soft(async () => {
      primary = await previewPrimary(page);
      check(primary);
    })
    .toPass({ timeout: 20_000 });

  return primary;
}

test("design-system library: save to library, switch packs, restore through versions", async ({
  page,
}) => {
  const api = await openHome(page);
  await deleteUserPackIfPresent(api, "user-house-editorial");

  const project = await openProject(page, api, {
    designMd: "Keep these notes.",
    packId: "editorial",
    prompt: "Library Journal",
  });

  const tree = mainDirection(project).workTree;

  const editorialCss = readFileSync(
    path.join(tree, "design-system/tokens.css"),
    "utf-8"
  );

  const editorialPrimary = await expectPreviewPrimary(page, (primary) =>
    expect.soft(primary).not.toBe("")
  );

  await chip(page, "Editorial").click();
  await page
    .getByRole("dialog", { name: "Design system" })
    .getByRole("button", { name: "Save to library…" })
    .click();
  const saveDialog = page.getByRole("dialog", { name: "Save to library" });
  await saveDialog.getByLabel("Design system name").fill("House Editorial");
  await saveDialog.getByRole("button", { exact: true, name: "Save" }).click();
  await expect.soft(saveDialog).toBeHidden();
  await expect
    .soft(
      page.locator(".ds-toast", {
        hasText: "Saved House Editorial to your library.",
      })
    )
    .toBeVisible();
  const packs = await api.call<PackSummary[]>("GET", "/api/packs");
  expect.soft(packs.at(-1)).toMatchObject({
    id: "user-house-editorial",
    provenance: "extracted",
    source: "user",
  });
  await expect.soft(chip(page, "House Editorial")).toBeVisible();
  await expect
    .poll(async () => (await api.project(project.id)).packId)
    .toBe("user-house-editorial");

  await chip(page, "House Editorial").click();
  await page
    .getByRole("dialog", { name: "Design system" })
    .getByRole("button", { name: "Change design system…" })
    .click();
  const change = page.getByRole("dialog", { name: "Change design system" });
  const list = change.getByRole("listbox", { name: "Design systems" });
  await expect
    .soft(list.getByRole("option", { name: "House Editorial" }))
    .toContainText("Yours");
  await expect
    .soft(list.getByRole("option", { name: "No design system" }))
    .toHaveCount(0);
  await list.getByRole("option", { exact: true, name: "Brutalist" }).click();
  await expect.soft(change).toBeHidden();
  await expect
    .soft(
      page.locator(".ds-toast", {
        hasText: "Switch to Brutalist design system.",
      })
    )
    .toBeVisible();
  await expect.soft(chip(page, "Brutalist")).toBeVisible();
  await expectPreviewPrimary(page, (primary) =>
    expect.soft(primary).not.toBe(editorialPrimary)
  );
  expect
    .soft(readFileSync(path.join(tree, "design-system/tokens.css"), "utf-8"))
    .not.toBe(editorialCss);
  expect
    .soft(readFileSync(path.join(tree, "DESIGN.md"), "utf-8"))
    .toContain("## Project notes\n\nKeep these notes.");

  await showVersions(page);
  await expect
    .soft(versionRow(page, "Switch to Brutalist design system"))
    .toHaveCount(1);
  const versions = await api.versions(project.id, "main");
  const before = versions[1];

  if (!before) {
    throw new Error("no version before the switch");
  }

  expect.soft(before.title).toBe("Save House Editorial to library");
  await versionRow(page, before.title)
    .first()
    .getByRole("button", { name: "Restore" })
    .click();
  await expect.soft(chip(page, "House Editorial")).toBeVisible();
  await expectPreviewPrimary(page, (primary) =>
    expect.soft(primary).toBe(editorialPrimary)
  );
  expect
    .soft(readFileSync(path.join(tree, "design-system/tokens.css"), "utf-8"))
    .toBe(editorialCss);
  await expect
    .poll(async () => (await api.project(project.id)).packId)
    .toBe("user-house-editorial");
});

test("design-system library: add a design system to a project without one", async ({
  page,
}) => {
  const api = await openHome(page);

  const project = await openProject(page, api, {
    prompt: "Plain Library Page",
    startRun: false,
  });

  const tree = mainDirection(project).workTree;
  await expect.soft(page.locator(".topbar .ds-chip")).toHaveCount(0);
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Add design system" })
    .click();
  const add = page.getByRole("dialog", { name: "Add design system" });
  await add
    .getByRole("listbox", { name: "Design systems" })
    .getByRole("option", { exact: true, name: "Editorial" })
    .click();
  await expect.soft(add).toBeHidden();
  await expect.soft(chip(page, "Editorial")).toBeVisible();
  await expect
    .soft(
      page.locator(".ds-toast", { hasText: "Apply Editorial design system." })
    )
    .toBeVisible();

  for (const file of [
    "design-system/tokens.json",
    "design-system/pack.json",
    "design-system/tokens.css",
    "DESIGN.md",
  ]) {
    expect.soft(existsSync(path.join(tree, file)), file).toBe(true);
  }

  expect.soft((await api.project(project.id)).packId).toBe("editorial");
});
