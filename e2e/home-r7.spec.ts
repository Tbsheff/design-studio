import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import type { Project, TrashedProject } from "../src/shared/contracts";
import { readState } from "./support/server";
import { mainDirection, openHome } from "./support/studio";

test("r7 trash: a deleted project shows in Trash, Restore brings it back, Delete forever removes the data folder and keeps the work tree", async ({
  page,
}) => {
  const trashCalls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/trash")) {
      trashCalls.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  const api = await openHome(page);

  const { project } = await api.call<{ project: Project }>(
    "POST",
    "/api/projects/from-starter",
    { starterId: "form" }
  );

  const { workTree } = mainDirection(project);
  await expect
    .poll(
      async () => (await api.project(project.id)).thumbnail?.versionId ?? null,
      { timeout: 15_000 }
    )
    .not.toBeNull();

  const first = await api.call<TrashedProject>(
    "DELETE",
    `/api/projects/${project.id}`
  );

  await page.reload();
  await expect
    .soft(page.getByRole("heading", { name: "Start a new project" }))
    .toBeVisible();
  await page.waitForTimeout(300);
  expect.soft(trashCalls).toEqual([]);

  await page.getByRole("button", { exact: true, name: "Trash" }).click();
  const dialog = page.getByRole("dialog", { name: "Trash" });
  await expect.soft(dialog).toBeVisible();
  const row = dialog.locator(`.trash-row[data-trash-id="${first.trashId}"]`);
  await expect.soft(row).toContainText(project.name);
  await expect.soft(row).toContainText("Deleted just now");
  await expect.soft(row).toContainText("Files in your folder stay");
  await expect.soft(row.locator(".trash-thumb img")).toBeVisible();

  await row.getByRole("button", { name: `Restore ${project.name}` }).click();
  await expect.soft(row).toHaveCount(0);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect.soft(dialog).toHaveCount(0);
  await expect
    .soft(page.locator(`.project-card[data-project-id="${project.id}"]`))
    .toBeVisible();

  const second = await api.call<TrashedProject>(
    "DELETE",
    `/api/projects/${project.id}`
  );

  const trashed = path.join(
    readState().dataDir,
    "trash",
    "projects",
    second.trashId
  );

  expect.soft(existsSync(trashed)).toBe(true);
  await page.reload();
  await page.getByRole("button", { exact: true, name: "Trash" }).click();
  const again = dialog.locator(`.trash-row[data-trash-id="${second.trashId}"]`);
  await expect.soft(again).toBeVisible();

  await dialog.getByRole("button", { name: /^Empty trash/ }).click();
  const emptyConfirm = page.getByRole("dialog", { name: "Empty the trash?" });
  await expect.soft(emptyConfirm).toBeVisible();
  await emptyConfirm.getByRole("button", { name: "Cancel" }).click();
  await expect.soft(emptyConfirm).toHaveCount(0);
  await expect.soft(again).toBeVisible();

  await again
    .getByRole("button", { name: `Delete ${project.name} forever` })
    .click();

  const confirm = page.getByRole("dialog", {
    name: `Delete “${project.name}” forever?`,
  });

  await expect.soft(confirm).toContainText("Files in your folder stay.");
  await confirm.getByRole("button", { name: "Delete forever" }).click();
  await expect.soft(confirm).toHaveCount(0);
  await expect.soft(again).toHaveCount(0);
  await expect.soft(dialog).toBeVisible();
  expect.soft(existsSync(trashed)).toBe(false);
  expect.soft(existsSync(path.join(workTree, "index.html"))).toBe(true);
  expect
    .soft((await api.projects()).map((item) => item.id))
    .not.toContain(project.id);
  await page.keyboard.press("Escape");
  await expect.soft(dialog).toHaveCount(0);
});
