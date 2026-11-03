import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { SkillCatalog } from "../src/shared/contracts";
import { ROOT, readState } from "./support/server";
import { claudeHomeFor, FIXTURE_SKILLS } from "./support/skills-fixture";
import { mainDirection, openHome, clickCreate } from "./support/studio";
import type { StudioApi } from "./support/studio";

const SHOTS = path.join(ROOT, "design-review");

async function shoot(page: Page, name: string): Promise<void> {
  for (const [width, height] of [
    [1440, 900],
    [800, 934],
  ] as const) {
    await page.setViewportSize({ height, width });
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(SHOTS, `skills-${name}-${width}.png`),
    });
  }

  await page.setViewportSize({ height: 1000, width: 1600 });
}

async function createWithAdvanced(page: Page, api: StudioApi) {
  await page.getByLabel("Describe the design").fill("Bakery landing page");
  await page.locator("details.advanced > summary").click();
  const list = page.locator("details.advanced .skills-field");
  await expect
    .soft(list.getByLabel(`Skill ${FIXTURE_SKILLS.brand}`))
    .toBeChecked();
  await list.getByLabel(`Skill ${FIXTURE_SKILLS.brand}`).uncheck();
  await expect.soft(list).toContainText("2 of 3 on");
  await expect.soft(list.locator(".skill-tag")).toHaveText(["Needs shell"]);
  await clickCreate(page);
  await expect.soft(page.locator(".topbar")).toBeVisible();

  const project = (await api.projects()).find(
    (p) => p.name === "Bakery landing page"
  );

  if (!project) {
    throw new Error("project not created");
  }

  await api.waitForRuns(project.id, 1);

  return project;
}

test("skills: API lists discovered skills, settings persist, composer and chat show skills", async ({
  page,
}) => {
  const api = await openHome(page);

  const catalog = await api.call<SkillCatalog>("GET", "/api/skills");
  expect
    .soft(catalog.skills.map((s) => [s.id, s.origin, s.needsBash]))
    .toEqual([
      [FIXTURE_SKILLS.brand, "personal", false],
      [FIXTURE_SKILLS.deck, "personal", true],
      [FIXTURE_SKILLS.review, "plugin:demo-plugin", false],
    ]);
  expect
    .soft(catalog.problems.map((p) => p.reason))
    .toEqual(["no SKILL.md in this folder"]);

  const project = await createWithAdvanced(page, api);
  expect
    .soft((await api.project(project.id)).settings.disabledSkills)
    .toEqual([FIXTURE_SKILLS.brand]);

  await page.getByRole("button", { exact: true, name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Project settings" });
  await expect
    .soft(dialog.getByLabel(`Skill ${FIXTURE_SKILLS.brand}`))
    .not.toBeChecked();
  await dialog.getByLabel(`Skill ${FIXTURE_SKILLS.brand}`).check();
  await dialog.getByLabel(`Skill ${FIXTURE_SKILLS.review}`).uncheck();
  await shoot(page, "settings");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect.soft(dialog).toBeHidden();
  await page.reload();
  expect
    .soft((await api.project(project.id)).settings.disabledSkills)
    .toEqual([FIXTURE_SKILLS.review]);
  await page.getByRole("button", { exact: true, name: "Settings" }).click();
  await expect
    .soft(
      page
        .getByRole("dialog", { name: "Project settings" })
        .getByLabel(`Skill ${FIXTURE_SKILLS.review}`)
    )
    .not.toBeChecked();
  await page.getByRole("button", { name: "Cancel" }).click();

  const indicator = page.getByTestId("skills-indicator");
  await expect.soft(indicator).toHaveText("2 skills");
  await indicator.click();
  const pop = page.getByRole("dialog", { name: "Skills for this project" });
  await pop.getByLabel(`Skill ${FIXTURE_SKILLS.review}`).check();
  await expect.soft(indicator).toHaveText("3 skills");
  await shoot(page, "indicator");
  await page.keyboard.press("Escape");
  await expect.soft(pop).toBeHidden();
  await expect
    .poll(async () => (await api.project(project.id)).settings.disabledSkills)
    .toEqual([]);

  const box = page.getByPlaceholder("Describe a change");
  await box.click();
  await page.keyboard.type("/");
  const picker = page.getByRole("dialog", { name: "Pick a skill" });
  await expect.soft(picker).toBeVisible();
  await expect.soft(box).toHaveValue("");
  await expect.soft(picker.getByRole("option")).toHaveCount(3);
  await expect
    .soft(picker.getByRole("option", { name: /deck-scripts/ }))
    .toContainText("Needs shell");
  await page.keyboard.type("review");
  await expect.soft(picker.getByRole("option")).toHaveCount(1);
  await expect
    .soft(picker.getByRole("option").first())
    .toContainText("demo-plugin");
  await shoot(page, "picker");
  await page.keyboard.press("Enter");
  await expect.soft(picker).toBeHidden();
  await expect
    .soft(page.locator(".composer .skill-chip"))
    .toHaveText(["demo-plugin:demo-review"]);

  await page.getByRole("button", { exact: true, name: "Skills" }).click();
  await expect.soft(picker.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await expect
    .soft(picker.getByRole("option").nth(1))
    .toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect.soft(picker).toBeHidden();
  await expect.soft(page.locator(".composer .skill-chip")).toHaveCount(1);

  await box.fill("Tighten the hero spacing");
  await page.getByRole("button", { name: "Send" }).click();
  await api.waitForRuns(project.id, 2);
  const runs = await api.runs(project.id);
  expect
    .soft(
      runs.some(
        (r) =>
          r.request.prompt ===
          "Tighten the hero spacing\n\nUse the demo-plugin:demo-review skill."
      )
    )
    .toBe(true);
  expect
    .soft(
      runs
        .find((r) => r.request.prompt.startsWith("Tighten"))
        ?.toolCalls.map((c) => c.name)
    )
    .toContain("Skill");
  const skillRow = page.locator('.tool-row[data-tool="Skill"]');
  await expect.soft(skillRow.locator(".tool-verb")).toContainText("Skill");
  await expect
    .soft(skillRow.locator("[data-slot=chip]"))
    .toHaveText("demo-plugin:demo-review");
  await expect.soft(page.locator(".composer .skill-chip")).toHaveCount(0);
  await expect
    .soft(page.locator(".msg.user").last().locator(".msg-skills"))
    .toHaveText("demo-plugin:demo-review");
  await expect
    .soft(page.locator(".msg.user").last())
    .not.toContainText("Use the demo-plugin");
  await shoot(page, "chat");

  await page
    .getByRole("button", { exact: true, name: "Details" })
    .last()
    .click();
  const details = page.getByRole("dialog", { name: "Run details" });
  await expect
    .soft(details.locator(".kv").first())
    .toContainText("Skills used");
  await expect
    .soft(details.locator(".kv").first())
    .toContainText("demo-plugin:demo-review");
  await shoot(page, "details");
  await details.getByRole("button", { name: "Close" }).click();

  await box.fill(`Add a footer [skill:${FIXTURE_SKILLS.brand}]`);
  await page.getByRole("button", { name: "Send" }).click();
  await api.waitForRuns(project.id, 3);
  await expect
    .soft(
      skillRow.filter({
        has: page.locator("[data-slot=chip]", { hasText: "brand-voice" }),
      })
    )
    .toHaveCount(1);
  expect.soft(mainDirection(await api.project(project.id)).id).toBeTruthy();
});

test("skills: empty state names ~/.claude/skills", async ({ page }) => {
  const home = claudeHomeFor(readState().dataDir);
  renameSync(path.join(home, "skills"), path.join(home, "skills.off"));
  renameSync(path.join(home, "settings.json"), path.join(home, "settings.off"));

  try {
    const api = await openHome(page);
    expect
      .soft((await api.call<SkillCatalog>("GET", "/api/skills")).skills)
      .toEqual([]);
    await page.getByLabel("Describe the design").fill("Empty skills page");
    await page.locator("details.advanced > summary").click();
    await expect
      .soft(page.locator("details.advanced").getByTestId("skills-empty"))
      .toContainText("~/.claude/skills");
    await clickCreate(page);
    await expect.soft(page.locator(".topbar")).toBeVisible();
    await expect
      .soft(page.getByTestId("skills-indicator"))
      .toHaveText("0 skills");
    await page.getByRole("button", { exact: true, name: "Skills" }).click();
    await expect
      .soft(
        page
          .getByRole("dialog", { name: "Pick a skill" })
          .getByTestId("skills-empty")
      )
      .toContainText("~/.claude/skills");
    await shoot(page, "empty");
  } finally {
    renameSync(path.join(home, "skills.off"), path.join(home, "skills"));
    renameSync(
      path.join(home, "settings.off"),
      path.join(home, "settings.json")
    );
  }
});

function writeBulkSkills(home: string, count: number): string[] {
  const dirs: string[] = [];

  for (let index = 1; index <= count; index += 1) {
    const name = `bulk-${String(index).padStart(2, "0")}`;
    const dir = path.join(home, "skills", name);
    mkdirSync(dir, { recursive: true });
    const manual = index > count - 2 ? "disable-model-invocation: true\n" : "";
    writeFileSync(
      path.join(dir, "SKILL.md"),
      `---\nname: ${name}\ndescription: Bulk skill number ${index} for the long list check.\n${manual}---\nBody.\n`
    );
    dirs.push(dir);
  }

  return dirs;
}

async function checkPickerFits(page: Page, height: number): Promise<void> {
  await page.setViewportSize({ height, width: 1440 });
  await page.getByRole("button", { exact: true, name: "Skills" }).click();
  const picker = page.getByRole("dialog", { name: "Pick a skill" });
  await expect.soft(picker).toBeVisible();
  await expect.soft(picker.getByRole("option")).toHaveCount(83);
  await expect.soft(picker).toContainText("2 manual-only skills not listed");
  const pop = await picker.boundingBox();
  const composer = await page.locator(".composer").boundingBox();
  const panel = await page.locator("aside").last().boundingBox();

  if (!pop || !composer || !panel) {
    throw new Error("missing boxes");
  }

  expect.soft(pop.y).toBeGreaterThanOrEqual(Math.max(0, panel.y) - 1);
  expect.soft(pop.y + pop.height).toBeLessThanOrEqual(composer.y + 12);
  expect.soft(pop.y + pop.height).toBeLessThanOrEqual(height);
  const list = picker.locator(".skill-opts");

  const sizes = await list.evaluate((el) => ({
    client: el.clientHeight,
    scroll: el.scrollHeight,
  }));

  expect.soft(sizes.scroll).toBeGreaterThan(sizes.client);
  await page.keyboard.press("ArrowUp");
  const last = picker.getByRole("option").last();
  await expect.soft(last).toHaveAttribute("aria-selected", "true");
  const listBox = await list.boundingBox();
  const lastBox = await last.boundingBox();

  if (!listBox || !lastBox) {
    throw new Error("missing list boxes");
  }

  expect
    .soft(lastBox.y + lastBox.height)
    .toBeLessThanOrEqual(listBox.y + listBox.height + 1);
  expect.soft(lastBox.y).toBeGreaterThanOrEqual(listBox.y - 1);
  await page.screenshot({
    path: path.join(SHOTS, `skills-long-${height}.png`),
  });
  await page.locator(".topbar").click({ position: { x: 400, y: 20 } });
  await expect.soft(picker).toBeHidden();
  await expect.soft(page.locator(".composer .skill-chip")).toHaveCount(0);
}

test("skills: a long skill list scrolls inside the picker and fits the panel", async ({
  page,
}) => {
  const home = claudeHomeFor(readState().dataDir);
  const dirs = writeBulkSkills(home, 82);

  try {
    const api = await openHome(page);
    await page.getByLabel("Describe the design").fill("Long skills page");
    await clickCreate(page);
    await expect.soft(page.locator(".topbar")).toBeVisible();

    const project = (await api.projects()).find(
      (p) => p.name === "Long skills page"
    );

    if (!project) {
      throw new Error("project not created");
    }

    await api.waitForRuns(project.id, 1);
    await expect
      .soft(page.getByTestId("skills-indicator"))
      .toHaveText("85 skills");
    await checkPickerFits(page, 1221);
    await checkPickerFits(page, 563);
    await page.getByRole("button", { exact: true, name: "Skills" }).click();
    await page.keyboard.type("bulk-80");
    await page.keyboard.press("Enter");
    await expect
      .soft(page.locator(".composer .skill-chip"))
      .toHaveText(["bulk-80"]);
  } finally {
    for (const dir of dirs) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});
