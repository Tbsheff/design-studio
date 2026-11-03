import { expect, test } from "@playwright/test";

import { BASE_URL } from "./support/server";
import {
  createProjectViaUi,
  frontFrame,
  openHome,
  setSelectMode,
} from "./support/studio";

test("g: Escape in the frame exits select mode; render check shows screenshots", async ({
  page,
}) => {
  const api = await openHome(page);

  const project = await createProjectViaUi(
    page,
    api,
    "Escape and render check",
    "html"
  );

  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText("Escape and render check");
  await api.waitForRuns(project.id, 1);

  await setSelectMode(page, true);
  await frame.locator(".lede").hover();
  await expect.soft(page.locator(".overlay .box.hover")).toHaveCount(1);
  await frame.locator("body").press("Escape");
  await expect
    .soft(page.getByRole("button", { name: /^Select/ }))
    .toHaveAttribute("aria-pressed", "false");
  await expect.soft(page.locator(".overlay .box.hover")).toHaveCount(0);
  await frame.locator("h1").click();
  await expect.soft(page.locator(".overlay .box.selected")).toHaveCount(0);

  await page.getByRole("button", { name: "Check render" }).click();
  const shots = page.locator("img.check-shot");
  await expect.soft(shots).toHaveCount(2, { timeout: 60_000 });

  for (const shot of await shots.all()) {
    await expect
      .poll(() =>
        shot.evaluate((img) => (img as HTMLImageElement).naturalWidth)
      )
      .toBeGreaterThan(0);
  }

  const outside = await fetch(
    `${BASE_URL}/api/projects/${project.id}/files?path=${encodeURIComponent("project.json")}`,
    {
      headers: { "x-studio-token": api.token },
    }
  );

  expect.soft(outside.status).toBe(404);

  const traversal = await fetch(
    `${BASE_URL}/api/projects/${project.id}/files?path=${encodeURIComponent("checks/../../../../etc/hosts")}`,
    {
      headers: { "x-studio-token": api.token },
    }
  );

  expect.soft(traversal.status).toBe(404);

  const noToken = await fetch(
    `${BASE_URL}/api/projects/${project.id}/files?path=checks/x.png`
  );

  expect.soft(noToken.status).toBe(403);
});
