import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  BASE_URL,
  readState,
  ROOT,
  startServer,
  stopServer,
  writeState,
} from "./support/server";
import {
  createProjectViaUi,
  frontFrame,
  mainDirection,
  openHome,
  sendPrompt,
  showVersions,
} from "./support/studio";
import type { StudioApi } from "./support/studio";

const CREATE_PROMPT = "Riverside Dental Clinic";
const MAIN_EDIT = "Book a cleaning online";
const ALT_EDIT = "Evening hours for families";

async function snapshotAll(api: StudioApi) {
  const projects = await api.projects();
  const out = [];

  for (const project of projects.sort((a, b) => a.id.localeCompare(b.id))) {
    const directions = [];

    for (const direction of project.directions) {
      const versions = await api.versions(project.id, direction.id);
      directions.push({
        head: direction.headVersionId,
        id: direction.id,
        name: direction.name,
        sessionId: direction.sessionId,
        versions: versions.map((version) => [
          version.id,
          version.title,
          version.meta.kind,
        ]),
      });
    }

    const runs = (await api.runs(project.id)).map((run) => [
      run.id,
      run.status,
      run.request.prompt,
      run.finalText,
    ]);

    out.push({
      directions,
      id: project.id,
      kind: project.kind,
      name: project.name,
      runs,
    });
  }

  return out;
}

test("f: restart keeps projects, directions, versions and messages", async ({
  page,
}) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, CREATE_PROMPT, "html");
  const main = mainDirection(project);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText(CREATE_PROMPT);
  await api.waitForRuns(project.id, 1);
  await sendPrompt(page, MAIN_EDIT);
  await expect
    .soft(frontFrame(page).locator(".mock-edit"))
    .toHaveText([MAIN_EDIT]);
  await api.waitForRuns(project.id, 2);
  const head = (await api.project(project.id)).directions[0]?.headVersionId;

  if (!head) {
    throw new Error("no head");
  }

  const alt = await api.call<{ id: string }>(
    "POST",
    `/api/projects/${project.id}/directions`,
    { fromVersionId: head, name: "Alt" }
  );

  await api.call("POST", `/api/projects/${project.id}/d/${alt.id}/runs`, {
    mode: "edit",
    prompt: ALT_EDIT,
  });
  await api.waitForRuns(project.id, 3);
  await showVersions(page);
  await page.locator(".list-item").filter({ hasText: "Main" }).click();
  await expect
    .soft(page.locator(`iframe.frame.front[src*="/${main.id}/"]`))
    .toHaveCount(1);

  const before = await snapshotAll(api);
  expect
    .soft(before.find((entry) => entry.id === project.id)?.directions)
    .toHaveLength(2);

  const state = readState();
  await stopServer(state.pid);
  await expect
    .poll(() =>
      fetch(`${BASE_URL}/`).then(
        () => "up",
        () => "down"
      )
    )
    .toBe("down");
  const { pid, listenMs } = await startServer(state.dataDir);
  writeState({ ...state, pid });
  const projectCount = before.length;
  const reactCount = before.filter((entry) => entry.kind === "react").length;
  mkdirSync(path.join(ROOT, "e2e", "results"), { recursive: true });
  writeFileSync(
    path.join(ROOT, "e2e", "results", "boot.json"),
    `${JSON.stringify({ measuredAt: new Date().toISOString(), method: "spawn tsx server to first 200 from GET /", projectCount, reactCount, restartListenMs: listenMs, targetMs: 3000 }, null, 2)}\n`
  );
  console.log(
    `[boot] restart with ${projectCount} projects (${reactCount} React): GET / answered ${listenMs}ms after spawn`
  );
  expect.soft(listenMs).toBeLessThan(3000);

  await page.reload();

  const token = page.locator('meta[name="studio-token"]');

  await expect(token).not.toHaveAttribute("content", api.token);

  const fresh = new (api.constructor as new (token: string) => StudioApi)(
    token ?? ""
  );

  expect.soft(await snapshotAll(fresh)).toEqual(before);

  await expect.soft(page.locator(".topbar")).toContainText(CREATE_PROMPT);
  await expect.soft(page.locator(".list-item")).toHaveCount(2);
  await expect.soft(page.locator("li.version")).toHaveCount(2);
  await expect
    .soft(page.locator(".msg.user .msg-body"))
    .toHaveText([CREATE_PROMPT, MAIN_EDIT]);
  await expect.soft(page.locator(".run .status.completed")).toHaveCount(2);
  await expect
    .soft(frontFrame(page).locator(".mock-edit"))
    .toHaveText([MAIN_EDIT]);

  await showVersions(page);
  await page.locator(".list-item").filter({ hasText: "Alt" }).click();
  await expect
    .soft(page.locator(`iframe.frame.front[src*="/${alt.id}/"]`))
    .toHaveCount(1);
  await expect.soft(page.locator(".msg.user .msg-body")).toHaveText([ALT_EDIT]);
  await expect
    .soft(frontFrame(page).locator(".mock-edit"))
    .toHaveText([MAIN_EDIT, ALT_EDIT]);

  await page.getByRole("button", { name: "Projects" }).click();
  await expect
    .soft(page.locator(".project-card").filter({ hasText: CREATE_PROMPT }))
    .toHaveCount(1);
});
