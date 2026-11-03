import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Frame, Page } from "@playwright/test";

import {
  BASE_URL,
  STUDIO_PORT,
  previewOriginFor,
  readState,
} from "../../support/server";
import {
  createProjectViaUi,
  frontFrame,
  mainDirection,
  openHome,
} from "../../support/studio";
import type { StudioApi } from "../../support/studio";
import { frameByUrl, saveResult } from "./helpers";

async function probeFrame(
  frame: Frame,
  studio: string,
  otherPreviewPath: string | null,
  otherOriginUrl: string | null = null
): Promise<Record<string, unknown>> {
  return frame.evaluate(
    async ([studioOrigin, otherPath, otherUrl]) => {
      const out: Record<string, unknown> = {};

      const attempt = async (
        name: string,
        fn: () => unknown
      ): Promise<void> => {
        try {
          out[name] = { ok: true, value: await fn() };
        } catch (error) {
          out[name] = { error: String(error).slice(0, 140), ok: false };
        }
      };

      await attempt("origin", () => location.origin);
      await attempt("hrefHasStudioToken", () =>
        location.href.includes("__studio_token")
      );
      await attempt("referrer", () => document.referrer);
      await attempt("parentDocumentTitle", () => window.parent.document.title);
      await attempt("topStudioTokenMeta", () =>
        window.top?.document
          .querySelector('meta[name="studio-token"]')
          ?.getAttribute("content")
      );
      await attempt("parentLocalStorage", () =>
        window.parent.localStorage.getItem("design-studio.ui.v1")
      );
      await attempt("ownCookie", () => document.cookie);
      await attempt("ownLocalStorageKeys", () => Object.keys(localStorage));
      await attempt("ownSessionStorageKeys", () => Object.keys(sessionStorage));
      await attempt("fetchStudioIndexHtml", async () =>
        (await (await fetch(`${studioOrigin}/`)).text()).slice(0, 60)
      );
      await attempt(
        "fetchApiSession",
        async () => (await fetch(`${studioOrigin}/api/session`)).status
      );
      await attempt(
        "fetchProjectsNoToken",
        async () => (await fetch(`${studioOrigin}/api/projects`)).status
      );
      await attempt(
        "fetchProjectsGuessedToken",
        async () =>
          (
            await fetch(`${studioOrigin}/api/projects`, {
              headers: { "x-studio-token": "0".repeat(64) },
            })
          ).status
      );
      await attempt("noCorsPostCreateProject", async () => {
        const res = await fetch(`${studioOrigin}/api/projects`, {
          body: JSON.stringify({ prompt: "csrf no-cors", kind: "html" }),
          headers: { "content-type": "text/plain" },
          method: "POST",
          mode: "no-cors",
        });

        return res.type;
      });
      await attempt("formPostCreateProject", async () => {
        const sink = document.createElement("iframe");
        sink.name = "csrf-sink";
        sink.style.display = "none";
        document.body.append(sink);
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${studioOrigin}/api/projects`;
        form.enctype = "text/plain";
        form.target = "csrf-sink";
        const field = document.createElement("input");
        field.name = '{"prompt":"csrf form","kind":"html","x":"';
        field.value = '"}';
        form.append(field);
        document.body.append(form);
        form.submit();
        await new Promise((resolve) => setTimeout(resolve, 1500));

        return "submitted";
      });

      if (otherPath) {
        await attempt(
          "fetchOtherProjectPreview",
          async () => (await fetch(otherPath)).status
        );
      }

      if (otherUrl) {
        await attempt("fetchOtherProjectOrigin", async () =>
          (await (await fetch(otherUrl)).text()).slice(0, 40)
        );
      }

      return out;
    },
    [studio, otherPreviewPath, otherOriginUrl] as const
  );
}

async function serverSideChecks(
  api: StudioApi,
  previewOrigin: string
): Promise<Record<string, number>> {
  const postWithPreviewOrigin = await fetch(`${BASE_URL}/api/projects`, {
    body: JSON.stringify({ prompt: "csrf with token", kind: "html" }),
    headers: {
      "content-type": "application/json",
      origin: previewOrigin,
      "x-studio-token": api.token,
    },
    method: "POST",
  });

  const getWithPreviewOrigin = await fetch(`${BASE_URL}/api/projects`, {
    headers: { origin: previewOrigin, "x-studio-token": api.token },
  });

  const sessionSameSite = await fetch(`${BASE_URL}/api/session`, {
    headers: { origin: previewOrigin, "sec-fetch-site": "same-site" },
  });

  const sessionNoHeader = await fetch(`${BASE_URL}/api/session`);

  return {
    getProjectsWithValidTokenButPreviewOrigin: getWithPreviewOrigin.status,
    getSessionNoFetchMetadata: sessionNoHeader.status,
    getSessionSameSite: sessionSameSite.status,
    postCreateWithValidTokenButPreviewOrigin: postWithPreviewOrigin.status,
  };
}

async function waitForMarker(
  file: string,
  timeoutMs: number
): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return null;
}

function listenerPid(port: number): number | null {
  try {
    const out = execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf-8" }
    ).trim();

    return out ? Number(out.split("\n")[0]) : null;
  } catch {
    return null;
  }
}

async function cookiesOf(page: Page): Promise<number> {
  return (await page.context().cookies()).length;
}

test("aC-51: preview frames cannot reach studio credentials or API", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const api = await openHome(page);

  const first = await createProjectViaUi(
    page,
    api,
    "Isolation other project",
    "html"
  );

  await api.waitForRuns(first.id, 1);
  await page.getByRole("button", { name: "Projects" }).click();
  const html = await createProjectViaUi(page, api, "Isolation html", "html");
  await api.waitForRuns(html.id, 1);
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Isolation html");

  const htmlFrame = await frameByUrl(
    page,
    `${previewOriginFor(html.id)}/d/${html.id}/`
  );

  const projectsBefore = (await api.projects()).length;

  const htmlProbe = await probeFrame(
    htmlFrame,
    BASE_URL,
    `/d/${first.id}/main/index.html`,
    `${previewOriginFor(first.id)}/d/${first.id}/main/index.html`
  );

  const htmlSandbox = await page
    .locator("iframe.frame.front")
    .getAttribute("sandbox");

  await page.getByRole("button", { name: "Projects" }).click();
  const react = await createProjectViaUi(page, api, "Isolation react", "react");
  await api.waitForRuns(react.id, 1, 180_000);
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Isolation react", {
      timeout: 90_000,
    });
  const reactUrl = (await api.preview(react.id, "main")).url;
  const reactOrigin = new URL(reactUrl).origin;
  const reactFrame = await frameByUrl(page, reactOrigin);
  const reactProbe = await probeFrame(reactFrame, BASE_URL, null);

  const reactSandbox = await page
    .locator("iframe.frame.front")
    .getAttribute("sandbox");

  const { dataDir } = readState();

  const viteFsProbe = await reactFrame.evaluate(
    async (targets) => {
      const out: Record<string, string> = {};

      for (const [name, url] of Object.entries(targets)) {
        try {
          const res = await fetch(url);
          out[name] =
            `${res.status} ${(await res.text()).slice(0, 40).replaceAll(/\s+/g, " ")}`;
        } catch (error) {
          out[name] = String(error).slice(0, 80);
        }
      }

      return out;
    },
    {
      etcHosts: "/@fs/etc/hosts",
      otherProjectIndexHtml: `/@fs${mainDirection(first).workTree}/index.html`,
      otherProjectJson: `/@fs${dataDir}/projects/${first.id}/project.json`,
      ownEventsLog: `/@fs${dataDir}/projects/${react.id}/events.jsonl`,
      ownProjectJson: `/@fs${dataDir}/projects/${react.id}/project.json`,
    }
  );

  await page.waitForTimeout(500);
  const projectsAfter = await api.projects();

  const csrfProjects = projectsAfter.filter((project) =>
    /csrf/i.test(project.name)
  );

  const server = await serverSideChecks(api, previewOriginFor(html.id));
  const serverVite = await serverSideChecks(api, reactOrigin);
  const studioCookies = await cookiesOf(page);

  const marker = path.join(
    os.tmpdir(),
    `ac51-vite-config-marker-${react.id}.json`
  );

  rmSync(marker, { force: true });
  const viteConfig = path.join(mainDirection(react).workTree, "vite.config.ts");
  const originalConfig = readFileSync(viteConfig, "utf-8");
  writeFileSync(
    viteConfig,
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { accessSync, constants, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const readable = (file: string): boolean => { try { accessSync(file, constants.R_OK); return true; } catch { return false; } };
writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ pid: process.pid, ppid: process.ppid, studioDataDirEnv: process.env.STUDIO_DATA_DIR ?? null, studioPortEnv: process.env.STUDIO_PORT ?? null, claudeConfigReadable: readable(path.join(os.homedir(), '.claude.json')) || readable(path.join(os.homedir(), '.claude')) }));
export default defineConfig({ plugins: [react()] });
`
  );
  let viteConfigMarker = await waitForMarker(marker, 30_000);
  let markerSource = "vite restart after config edit";

  if (!viteConfigMarker) {
    await api.call("POST", `/api/projects/${react.id}/d/main/keep`);

    const head =
      (await api.project(react.id)).directions[0]?.headVersionId ?? null;

    const direction = await api.call<{ id: string }>(
      "POST",
      `/api/projects/${react.id}/directions`,
      { fromVersionId: head, name: "Config probe" }
    );

    await api.preview(react.id, direction.id);
    viteConfigMarker = await waitForMarker(marker, 60_000);
    markerSource = "new direction from version with edited config";
  }

  const studioListener = listenerPid(STUDIO_PORT);
  writeFileSync(viteConfig, originalConfig);

  const result = {
    csrfProjects: csrfProjects.map((project) => project.name),
    htmlProbe,
    htmlSandbox,
    projectsAfter: projectsAfter.length,
    projectsBefore,
    reactProbe,
    reactSandbox,
    serverSideFromHtmlPreviewOrigin: server,
    serverSideFromReactPreviewOrigin: serverVite,
    studioCookies,
    viteConfig: {
      marker: viteConfigMarker,
      markerSource,
      statePid: readState().pid,
      studioListenerPid: studioListener,
    },
    viteFsProbe,
  };

  saveResult("ac51", result);

  for (const probe of [htmlProbe, reactProbe]) {
    expect.soft((probe.parentDocumentTitle as { ok: boolean }).ok).toBe(false);
    expect.soft((probe.topStudioTokenMeta as { ok: boolean }).ok).toBe(false);
    expect.soft((probe.parentLocalStorage as { ok: boolean }).ok).toBe(false);
    expect.soft((probe.fetchStudioIndexHtml as { ok: boolean }).ok).toBe(false);
    expect.soft((probe.fetchProjectsNoToken as { ok: boolean }).ok).toBe(false);
    expect
      .soft((probe.fetchProjectsGuessedToken as { ok: boolean }).ok)
      .toBe(false);
    expect.soft((probe.fetchApiSession as { ok: boolean }).ok).toBe(false);
  }

  expect.soft(csrfProjects).toHaveLength(0);
  expect.soft(server.postCreateWithValidTokenButPreviewOrigin).toBe(403);
  expect.soft(serverVite.postCreateWithValidTokenButPreviewOrigin).toBe(403);
  expect.soft(server.getSessionSameSite).toBe(403);
  expect
    .soft(htmlProbe.fetchOtherProjectPreview)
    .toEqual({ ok: true, value: 403 });
  expect
    .soft((htmlProbe.fetchOtherProjectOrigin as { ok: boolean }).ok)
    .toBe(false);

  const configMarker = viteConfigMarker as {
    pid: number;
    studioDataDirEnv: string | null;
    studioPortEnv: string | null;
  } | null;

  if (configMarker) {
    expect
      .soft(
        configMarker.pid,
        "vite.config.ts must not run inside the studio server process"
      )
      .not.toBe(studioListener);
    expect.soft(configMarker.pid).not.toBe(readState().pid);
    expect.soft(configMarker.studioDataDirEnv).toBeNull();
    expect.soft(configMarker.studioPortEnv).toBeNull();
  }
});
