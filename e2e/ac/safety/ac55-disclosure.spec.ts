import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { ROOT, readState } from "../../support/server";
import {
  createProjectViaUi,
  frontFrame,
  openHome,
  sendPrompt,
} from "../../support/studio";
import { saveResult } from "./helpers";

const DISCLOSURE =
  /anthropic|claude|sent to|remote model|third[- ]party|leaves? (your|this) (machine|computer)|privacy|data (is|are) (sent|shared)/i;

test("aC-55: state is local and remote model use is disclosed in the UI", async ({
  page,
}) => {
  const api = await openHome(page);
  const homeText = await page.locator("body").textContent();

  const project = await createProjectViaUi(
    page,
    api,
    "Disclosure page",
    "html"
  );

  await api.waitForRuns(project.id, 1);
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Disclosure page");
  await sendPrompt(page, "Second prompt");
  await api.waitForRuns(project.id, 2);
  const studioText = await page.locator("body").textContent();

  const titles = await page
    .locator("[title]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("title") ?? "")
    );

  const ariaLabels = await page
    .locator("[aria-label]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label") ?? "")
    );

  const assetsDir = path.join(ROOT, "dist", "ui", "assets");

  const bundleHits = readdirSync(assetsDir)
    .filter((file) => file.endsWith(".js"))
    .flatMap((file) =>
      [
        ...readFileSync(path.join(assetsDir, file), "utf-8").matchAll(
          /.{0,40}(anthropic|sent to anthropic|remote model|privacy).{0,40}/gi
        ),
      ].map((m) => m[0])
    );

  const { dataDir } = readState();
  const projectDir = path.join(dataDir, "projects", project.id);
  const stored = readdirSync(projectDir);

  const result = {
    ariaHits: ariaLabels.filter((t) => DISCLOSURE.test(t)),
    bundleHits: bundleHits.slice(0, 10),
    homeHit: homeText.match(DISCLOSURE)?.[0] ?? null,
    homeText: homeText.slice(0, 600),
    storedLocally: { entries: stored, projectDir },
    studioHit: studioText.match(DISCLOSURE)?.[0] ?? null,
    titleHits: titles.filter((t) => DISCLOSURE.test(t)),
  };

  saveResult("ac55", result);
  expect
    .soft(stored)
    .toEqual(expect.arrayContaining(["project.json", "runs", "git"]));
  expect
    .soft(
      result.homeHit ?? result.studioHit,
      "UI must disclose that prompts go to a remote model"
    )
    .not.toBeNull();
});
