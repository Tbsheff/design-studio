import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  createProjectViaUi,
  frontFrame,
  headVersion,
  mainDirection,
  openHome,
  sendPrompt,
  showVersions,
} from "./support/studio";

const CREATE_PROMPT = "Trailhead Outfitters";
const EDIT_A = "Direction A copy";
const EDIT_B = "Direction B copy";
const EDIT_A2 = "Direction A second pass";

async function pickDirection(
  page: Page,
  name: string,
  id: string
): Promise<void> {
  await showVersions(page);
  await page.locator(".list-item").filter({ hasText: name }).click();
  await expect.soft(page.locator(".topbar")).toContainText(`/ ${name}`);
  await expect
    .soft(page.locator(`iframe.frame.front[src*="/${id}/"]`))
    .toHaveCount(1);
}

async function toggleHeadCompare(page: Page): Promise<void> {
  await showVersions(page);

  const headRow = page
    .locator("li.version")
    .filter({ has: page.locator(".badge", { hasText: "Head" }) });

  await headRow.getByRole("button", { name: "Compare" }).click();
  await expect
    .soft(headRow.getByRole("button", { name: "Comparing" }))
    .toBeVisible();
}

test("d: two directions, separate edits, compare, resume one", async ({
  page,
}) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, CREATE_PROMPT, "html");
  const directionA = mainDirection(project);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText(CREATE_PROMPT);
  await api.waitForRuns(project.id, 1);
  const forkPoint = await headVersion(api, project.id, directionA.id);

  await showVersions(page);

  const headRow = page
    .locator("li.version")
    .filter({ has: page.locator(".badge", { hasText: "Head" }) });

  await headRow.getByRole("button", { name: "Branch" }).click();
  await page.getByLabel("Direction name").fill("Direction B");
  await page.getByRole("button", { name: "Create direction" }).click();
  await expect.soft(page.locator(".topbar")).toContainText("/ Direction B");
  const withB = await api.project(project.id);

  const directionB = withB.directions.find(
    (direction) => direction.name === "Direction B"
  );

  if (!directionB) {
    throw new Error("direction B missing");
  }

  expect.soft(directionB.workTree).not.toBe(directionA.workTree);
  expect.soft(directionB.parentVersionId).toBe(forkPoint.id);
  await expect
    .soft(page.locator(`iframe.frame.front[src*="/${directionB.id}/"]`))
    .toHaveCount(1);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText(CREATE_PROMPT);

  await sendPrompt(page, EDIT_B);
  await expect.soft(frontFrame(page).locator(".mock-edit")).toHaveText(EDIT_B);
  await api.waitForRuns(project.id, 2);
  await toggleHeadCompare(page);

  await pickDirection(page, directionA.name, directionA.id);
  await expect.soft(frontFrame(page).locator(".mock-edit")).toHaveCount(0);
  await sendPrompt(page, EDIT_A);
  await expect.soft(frontFrame(page).locator(".mock-edit")).toHaveText(EDIT_A);
  await api.waitForRuns(project.id, 3);
  await toggleHeadCompare(page);

  await page
    .getByRole("button", { exact: true, name: "Compare" })
    .first()
    .click();
  const panes = page.locator(".compare-pane");
  await expect.soft(panes).toHaveCount(2);
  const leftFrame = page.frameLocator(".compare-pane:nth-child(1) iframe");
  const rightFrame = page.frameLocator(".compare-pane:nth-child(2) iframe");
  await expect.soft(leftFrame.locator(".mock-edit")).toHaveText(EDIT_B);
  await expect.soft(rightFrame.locator(".mock-edit")).toHaveText(EDIT_A);
  await expect.soft(leftFrame.locator("h1")).toHaveText(CREATE_PROMPT);
  await expect.soft(rightFrame.locator("h1")).toHaveText(CREATE_PROMPT);
  await page.getByRole("button", { name: "Close compare" }).click();

  const bFileBefore = readFileSync(
    path.join(directionB.workTree, "index.html"),
    "utf-8"
  );

  const bHeadBefore = await headVersion(api, project.id, directionB.id);
  const aHeadBefore = await headVersion(api, project.id, directionA.id);

  const aSessionBefore = (await api.project(project.id)).directions.find(
    (d) => d.id === directionA.id
  )?.sessionId;

  expect.soft(aSessionBefore).toBeTruthy();

  await sendPrompt(page, EDIT_A2);
  await expect
    .soft(frontFrame(page).locator(".mock-edit"))
    .toHaveText([EDIT_A, EDIT_A2]);
  const runs = await api.waitForRuns(project.id, 4);

  const aHeadAfter = await headVersion(api, project.id, directionA.id);
  expect.soft(aHeadAfter.parentId).toBe(aHeadBefore.id);
  expect.soft(aHeadAfter.meta.prompt).toBe(EDIT_A2);
  const resumed = runs.find((run) => run.request.prompt === EDIT_A2);
  expect.soft(resumed?.directionId).toBe(directionA.id);
  expect.soft(resumed?.sessionId).toBe(aSessionBefore);

  const aFile = readFileSync(
    path.join(directionA.workTree, "index.html"),
    "utf-8"
  );

  expect.soft(aFile).toContain(EDIT_A);
  expect.soft(aFile).toContain(EDIT_A2);
  expect.soft(aFile).not.toContain(EDIT_B);

  expect
    .soft(readFileSync(path.join(directionB.workTree, "index.html"), "utf-8"))
    .toBe(bFileBefore);
  expect
    .soft((await headVersion(api, project.id, directionB.id)).id)
    .toBe(bHeadBefore.id);
  const bVersions = await api.versions(project.id, directionB.id);
  expect
    .soft(bVersions.some((version) => version.meta.prompt === EDIT_A2))
    .toBe(false);
  await pickDirection(page, "Direction B", directionB.id);
  await expect.soft(frontFrame(page).locator(".mock-edit")).toHaveText(EDIT_B);
});
