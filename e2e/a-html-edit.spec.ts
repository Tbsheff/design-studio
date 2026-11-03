import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createProjectViaUi,
  frontFrame,
  headVersion,
  mainDirection,
  openHome,
  selectInFrame,
  sendPrompt,
  showVersions,
  versionRow,
} from "./support/studio";

const CREATE_PROMPT = "Harbor Coffee Roasters";
const EDIT_PROMPT = "Fresh beans every morning";

function changedLines(
  before: string,
  after: string
): { index: number; before: string; after: string }[] {
  const a = before.split("\n");
  const b = after.split("\n");
  expect.soft(b).toHaveLength(a.length);

  return a.flatMap((line, index) =>
    line === b[index] ? [] : [{ after: b[index] ?? "", before: line, index }]
  );
}

test("a: HTML mock create, select edit, undo, restore, export", async ({
  page,
  context,
}) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, CREATE_PROMPT, "html");
  const main = mainDirection(project);
  const frame = frontFrame(page);

  await expect.soft(frame.locator("h1")).toHaveText(CREATE_PROMPT);
  await api.waitForRuns(project.id, 1);
  await expect.soft(page.locator("li.version")).toHaveCount(1);
  const firstHead = await headVersion(api, project.id, main.id);

  const indexFile = path.join(main.workTree, "index.html");
  const beforeEdit = readFileSync(indexFile, "utf-8");
  const ledeBefore = await frame.locator(".lede").textContent();
  const cardsBefore = await frame.locator(".card").allTextContents();

  await selectInFrame(page, "h1");
  await expect.soft(page.locator(".chip")).toHaveCount(1);
  await sendPrompt(page, EDIT_PROMPT);

  await expect.soft(frame.locator("h1")).toHaveText(EDIT_PROMPT);
  await api.waitForRuns(project.id, 2);
  await expect.soft(frame.locator(".lede")).toHaveText(ledeBefore ?? "");
  expect
    .soft(await frame.locator(".card").allTextContents())
    .toEqual(cardsBefore);

  const afterEdit = readFileSync(indexFile, "utf-8");
  const diff = changedLines(beforeEdit, afterEdit);
  expect.soft(diff).toHaveLength(1);
  expect.soft(diff[0]?.before.trim()).toBe(`<h1>${CREATE_PROMPT}</h1>`);
  expect.soft(diff[0]?.after.trim()).toBe(`<h1>${EDIT_PROMPT}</h1>`);
  await expect.soft(page.locator("li.version")).toHaveCount(2);
  const editVersion = await headVersion(api, project.id, main.id);
  expect.soft(editVersion.meta.prompt).toBe(EDIT_PROMPT);
  expect.soft(editVersion.changedFiles).toEqual(["index.html"]);

  await showVersions(page);
  await page.getByRole("button", { exact: true, name: "Undo" }).click();
  await expect
    .poll(async () => (await headVersion(api, project.id, main.id)).meta.kind)
    .toBe("undo");
  await expect.soft(frame.locator("h1")).toHaveText(CREATE_PROMPT);
  expect.soft(readFileSync(indexFile, "utf-8")).toBe(beforeEdit);
  await expect.soft(page.locator("li.version")).toHaveCount(3);
  const versionsAfterUndo = await api.versions(project.id, main.id);
  expect
    .soft(versionsAfterUndo.map((version) => version.id))
    .toContain(editVersion.id);
  const undoHead = await headVersion(api, project.id, main.id);
  expect.soft(undoHead.meta.kind).toBe("undo");
  expect.soft(undoHead.id).not.toBe(firstHead.id);

  const undoneRow = page.locator("li.version").filter({
    has: page.locator(`.version-title span[title="${EDIT_PROMPT}"]`),
  });

  await expect.soft(undoneRow).toHaveCount(1);
  await undoneRow.getByRole("button", { name: "Restore" }).click();
  await expect
    .poll(async () => (await headVersion(api, project.id, main.id)).meta.kind)
    .toBe("restore");
  await expect.soft(frame.locator("h1")).toHaveText(EDIT_PROMPT);
  expect.soft(readFileSync(indexFile, "utf-8")).toBe(afterEdit);
  const restoredHead = await headVersion(api, project.id, main.id);
  expect.soft(restoredHead.meta.kind).toBe("restore");
  await expect.soft(page.locator("li.version")).toHaveCount(4);

  const headRow = versionRow(page, restoredHead.title).filter({
    has: page.locator(".badge", { hasText: "Head" }),
  });

  await headRow.getByRole("button", { name: "Export" }).click();
  const exportDialog = page.getByRole("dialog", { name: "Export" });
  await exportDialog.getByRole("radio", { name: "Source" }).click();
  const downloadPromise = page.waitForEvent("download");
  await exportDialog.getByRole("button", { name: "Export zip" }).click();
  const download = await downloadPromise;
  const outDir = mkdtempSync(path.join(os.tmpdir(), "studio export "));
  const zipPath = path.join(outDir, "design.zip");
  await download.saveAs(zipPath);

  const listing = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);

  expect.soft(listing).toContain("index.html");
  const extracted = path.join(outDir, "site");
  execFileSync("unzip", ["-q", zipPath, "-d", extracted]);

  const exportedHtml = readFileSync(
    path.join(extracted, "index.html"),
    "utf-8"
  );

  expect.soft(exportedHtml).not.toContain("data-studio-loc");
  expect.soft(exportedHtml).not.toContain("__studio");
  expect.soft(existsSync(path.join(extracted, ".studio"))).toBe(false);

  const standalone = await context.newPage();
  const errors: string[] = [];
  standalone.on("pageerror", (error) => errors.push(error.message));
  await standalone.goto(pathToFileURL(path.join(extracted, "index.html")).href);
  await expect.soft(standalone.locator("h1")).toHaveText(EDIT_PROMPT);
  await expect.soft(standalone.locator(".lede")).toHaveText(ledeBefore ?? "");
  expect.soft(errors).toEqual([]);
  await standalone.close();
});
