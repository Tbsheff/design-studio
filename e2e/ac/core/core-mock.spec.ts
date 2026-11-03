import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import type {
  Project,
  RunSummary,
  Version,
} from "../../../src/shared/contracts";
import {
  BASE_URL,
  PREVIEW_PORT,
  projectsDirFor,
  readState,
  ROOT,
  startServer,
  stopServer,
  writeState,
} from "../../support/server";
import {
  createProjectViaUi,
  frontFrame,
  headVersion,
  mainDirection,
  openHome,
  selectInFrame,
  sendPrompt,
  StudioApi,
  openFolderByPath,
} from "../../support/studio";

function listTree(
  dir: string,
  skip = new Set(["node_modules", "dist"])
): string[] {
  const out: string[] = [];

  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) {
        continue;
      }
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else {
        out.push(path.relative(dir, full));
      }
    }
  };

  walk(dir);

  return out.sort();
}

async function exportVersion(
  api: StudioApi,
  pid: string,
  vid: string,
  dest: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/projects/${pid}/versions/${vid}/export`,
    { headers: { "x-studio-token": api.token } }
  );

  expect.soft(res.status).toBe(200);
  mkdirSync(dest, { recursive: true });
  const zip = path.join(dest, "..", `${path.basename(dest)}.zip`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync("unzip", ["-q", zip, "-d", dest]);
}

function log(label: string, value: unknown): void {
  console.log(
    `[ac-core] ${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`
  );
}

test("aC-01 AC-02 AC-03: create HTML from a text prompt, no deps and no build", async ({
  page,
}) => {
  const api = await openHome(page);
  await expect
    .soft(page.getByRole("radiogroup", { name: "Project kind" }))
    .toBeVisible();
  await expect.soft(page.getByRole("radio", { name: "HTML" })).toBeVisible();
  await expect
    .soft(page.getByRole("radio", { name: "React + Vite" }))
    .toBeVisible();
  const prompt = "Harbor Street Coffee Roasters";
  const started = Date.now();
  const project = await createProjectViaUi(page, api, prompt, "html");
  expect.soft(project.kind).toBe("html");
  const main = mainDirection(project);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText(prompt);
  const renderMs = Date.now() - started;
  const runs = await api.waitForRuns(project.id, 1);
  expect.soft(runs[0]?.request.prompt).toBe(prompt);
  expect.soft(runs[0]?.status).toBe("completed");
  const files = listTree(main.workTree, new Set());
  log("AC-03 html work tree", files);
  expect.soft(files).not.toContain("package.json");
  expect.soft(existsSync(path.join(main.workTree, "node_modules"))).toBe(false);
  expect
    .soft(readFileSync(path.join(main.workTree, project.entry), "utf-8"))
    .toContain(prompt);
  const preview = (await api.preview(project.id, main.id)).url;
  log("AC-03 preview url", preview);
  expect.soft(new URL(preview).port).toBe(String(PREVIEW_PORT));
  const served = await fetch(preview);
  expect.soft(served.status).toBe(200);
  expect.soft(await served.text()).toContain(prompt);
  log("AC-01 create-to-h1 ms", renderMs);
});

test("aC-02 AC-04: React/Vite project uses standard conventions and npm run build works on an export", async ({
  page,
}) => {
  const api = await openHome(page);
  const prompt = "Northwind Trail Maps";
  const project = await createProjectViaUi(page, api, prompt, "react");
  expect.soft(project.kind).toBe("react");
  const main = mainDirection(project);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText(prompt, {
    timeout: 60_000,
  });
  await api.waitForRuns(project.id, 1);
  const files = listTree(main.workTree);
  log("AC-04 react work tree", files);

  for (const required of [
    "package.json",
    "index.html",
    "tsconfig.json",
    "vite.config.ts",
    "src/main.tsx",
    "src/App.tsx",
  ]) {
    expect(files).toContain(required);
  }
  const pkg = JSON.parse(
    readFileSync(path.join(main.workTree, "package.json"), "utf-8")
  ) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  log("AC-04 scripts", pkg.scripts);
  expect.soft(pkg.scripts.dev).toMatch(/\bvite\b/);
  expect.soft(pkg.scripts.build).toMatch(/vite build/);
  expect
    .soft(Object.keys(pkg.dependencies))
    .toEqual(expect.arrayContaining(["react", "react-dom"]));
  expect
    .soft(Object.keys(pkg.devDependencies))
    .toEqual(
      expect.arrayContaining(["vite", "typescript", "@vitejs/plugin-react"])
    );
  expect
    .soft(readFileSync(path.join(main.workTree, "src", "main.tsx"), "utf-8"))
    .toMatch(/createRoot/);
  const preview = (await api.preview(project.id, main.id)).url;
  expect.soft(new URL(preview).port).not.toBe(String(PREVIEW_PORT));

  const head = await headVersion(api, project.id, main.id);
  const dest = path.join(readState().workDir, `export-${project.id}`);
  await exportVersion(api, project.id, head.id, dest);
  const exported = listTree(dest);
  log("AC-04 exported files", exported);
  expect.soft(exported).toContain("package.json");
  expect
    .soft(exported.some((file) => file.includes("data-studio")))
    .toBe(false);
  const exportedLink = path.join(dest, "node_modules");

  const linkInZip =
    existsSync(exportedLink) || readdirSync(dest).includes("node_modules");

  log(
    "AC-04 export contains node_modules entry",
    linkInZip ? `yes -> ${readlinkSync(exportedLink)}` : "no"
  );
  expect.soft(linkInZip).toBe(false);
  symlinkSync(path.join(ROOT, "node_modules"), exportedLink, "dir");

  const output = execFileSync("npm", ["run", "build"], {
    cwd: dest,
    encoding: "utf-8",
  });

  log("AC-04 build tail", output.trim().split("\n").slice(-3).join(" | "));
  expect.soft(existsSync(path.join(dest, "dist", "index.html"))).toBe(true);

  const assets = readdirSync(path.join(dest, "dist", "assets")).filter((name) =>
    name.endsWith(".js")
  );

  expect.soft(assets.length).toBeGreaterThan(0);
  expect
    .soft(
      readFileSync(path.join(dest, "dist", "assets", assets[0] ?? ""), "utf-8")
    )
    .toContain(prompt);
});

test("aC-05: open an existing create-vite style React project", async ({
  page,
}) => {
  const { workDir } = readState();
  const folder = path.join(workDir, "existing apps", "create vite app");
  mkdirSync(path.join(folder, "src"), { recursive: true });

  const files: Record<string, string> = {
    "index.html":
      '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Existing</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
    "package.json": JSON.stringify(
      {
        name: "create-vite-app",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc -b && vite build",
          preview: "vite preview",
        },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: {
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          "@vitejs/plugin-react": "^5.0.0",
          typescript: "^5.6.0",
          vite: "^7.0.0",
        },
      },
      null,
      2
    ),
    "src/App.tsx":
      "import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <main>\n      <h1>Existing Vite App</h1>\n      <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>\n    </main>\n  );\n}\n",
    "src/index.css": "body { font-family: system-ui; margin: 2rem; }\n",
    "src/main.tsx":
      "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n",
    "tsconfig.app.json": JSON.stringify(
      {
        compilerOptions: {
          tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          isolatedModules: true,
        },
        include: ["src"],
      },
      null,
      2
    ),
    "tsconfig.json": JSON.stringify(
      {
        files: [],
        references: [
          { path: "./tsconfig.app.json" },
          { path: "./tsconfig.node.json" },
        ],
      },
      null,
      2
    ),
    "tsconfig.node.json": JSON.stringify(
      {
        compilerOptions: {
          tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
          target: "ES2023",
          lib: ["ES2023"],
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["vite.config.ts"],
      },
      null,
      2
    ),
    "vite.config.ts":
      "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n",
  };

  for (const [rel, content] of Object.entries(files)) {
    writeFileSync(path.join(folder, rel), content);
  }
  symlinkSync(
    path.join(ROOT, "node_modules"),
    path.join(folder, "node_modules"),
    "dir"
  );

  const api = await openHome(page);
  await openFolderByPath(page, folder);
  await expect.soft(page.locator(".topbar")).toBeVisible();

  const project = (await api.projects()).find(
    (candidate) => candidate.imported?.sourcePath === realpathSync(folder)
  );

  if (!project) {
    throw new Error("imported project not found");
  }
  expect.soft(project.kind).toBe("react");
  expect
    .soft(realpathSync(mainDirection(project).workTree))
    .toBe(realpathSync(folder));
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText("Existing Vite App", {
    timeout: 60_000,
  });
  await frame.locator("button").click();
  await expect.soft(frame.locator("button")).toHaveText("count is 1");
  await selectInFrame(page, "h1");
  await sendPrompt(page, "Edited after open");
  await expect.soft(frame.locator("h1")).toHaveText("Edited after open");
  await api.waitForRuns(project.id, 1);
  expect
    .soft(readFileSync(path.join(folder, "src", "App.tsx"), "utf-8"))
    .toContain("<h1>Edited after open</h1>");
  expect
    .soft(readFileSync(path.join(folder, "vite.config.ts"), "utf-8"))
    .toBe(files["vite.config.ts"]);

  const output = execFileSync("npm", ["run", "build"], {
    cwd: folder,
    encoding: "utf-8",
  });

  log("AC-05 build tail", output.trim().split("\n").slice(-2).join(" | "));
  expect.soft(existsSync(path.join(folder, "dist", "index.html"))).toBe(true);
});

test("aC-06 AC-07: generated source is real, editable on disk, and stored as plain files", async ({
  page,
}) => {
  const api = await openHome(page);
  const prompt = "Maple Grove Library";
  const project = await createProjectViaUi(page, api, prompt, "html");
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText(prompt);
  await api.waitForRuns(project.id, 1);
  const indexFile = path.join(main.workTree, "index.html");
  const source = readFileSync(indexFile, "utf-8");
  log("AC-06 index.html lines", source.split("\n").length);
  expect.soft(source).toMatch(/<!doctype html>/i);
  expect.soft(source).toContain(`<h1>${prompt}</h1>`);
  expect.soft(source).not.toContain("data-studio-loc");
  writeFileSync(
    indexFile,
    source.replace(
      `<h1>${prompt}</h1>`,
      "<h1>Hand edited in a text editor</h1>"
    )
  );
  await expect
    .soft(frame.locator("h1"))
    .toHaveText("Hand edited in a text editor");
  await expect
    .soft(page.locator(".banner"))
    .toContainText("Unfinished changes");
  await page.locator(".banner").getByRole("button", { name: "Keep" }).click();
  await expect.soft(page.locator(".banner")).toHaveCount(0);

  const react = await api.call<{ project: Project }>("POST", "/api/projects", {
    kind: "react",
    prompt: "Editable React",
  });

  await api.waitForRuns(react.project.id, 1);

  const appFile = path.join(
    mainDirection(react.project).workTree,
    "src",
    "App.tsx"
  );

  const app = readFileSync(appFile, "utf-8");
  expect.soft(app).toMatch(/export default function App/);
  expect.soft(app).not.toContain("data-studio-loc");

  const { dataDir } = readState();
  const projectDir = path.join(dataDir, "projects", project.id);

  const projectJson = JSON.parse(
    readFileSync(path.join(projectDir, "project.json"), "utf-8")
  ) as Project;

  expect.soft(projectJson.id).toBe(project.id);
  expect
    .soft(
      realpathSync(main.workTree).startsWith(
        realpathSync(projectsDirFor(dataDir)) + path.sep
      )
    )
    .toBe(true);
  expect.soft(existsSync(path.join(main.workTree, ".git"))).toBe(false);
  expect.soft(statSync(indexFile).isFile()).toBe(true);
  const head = await headVersion(api, project.id, main.id);
  const gitEnv = { ...process.env, GIT_DIR: path.join(projectDir, "git") };
  expect
    .soft(
      execFileSync("git", ["cat-file", "-t", head.id], {
        encoding: "utf-8",
        env: gitEnv,
      }).trim()
    )
    .toBe("commit");

  const committed = execFileSync("git", ["show", `${head.id}:index.html`], {
    encoding: "utf-8",
    env: gitEnv,
  });

  expect.soft(committed).toContain("Hand edited in a text editor");
  const runFiles = readdirSync(path.join(projectDir, "runs"));
  expect.soft(runFiles.some((name) => name.endsWith(".jsonl"))).toBe(true);

  const allFiles = execFileSync(
    "find",
    [
      dataDir,
      "-type",
      "f",
      "-not",
      "-path",
      "*/git/objects/*",
      "-not",
      "-path",
      "*/node_modules/*",
    ],
    { encoding: "utf-8" }
  )
    .trim()
    .split("\n");

  const blobs = allFiles.filter((file) =>
    /\.(db|sqlite|sqlite3|leveldb|ldb)$/i.test(file)
  );

  log("AC-07 data files", {
    count: allFiles.length,
    dbFiles: blobs.length,
    top: readdirSync(projectDir),
  });
  expect.soft(blobs).toEqual([]);
});

test("aC-14: failed and canceled runs keep the last completed version", async ({
  page,
}) => {
  const api = await openHome(page);
  const prompt = "Cedar Hill Bakery";
  const project = await createProjectViaUi(page, api, prompt, "html");
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toHaveText(prompt);
  await api.waitForRuns(project.id, 1);
  const completed = await headVersion(api, project.id, main.id);
  const indexFile = path.join(main.workTree, "index.html");
  const completedHtml = readFileSync(indexFile, "utf-8");

  const gitEnv = {
    ...process.env,
    GIT_DIR: path.join(readState().dataDir, "projects", project.id, "git"),
  };

  const treeOf = (commit: string) =>
    execFileSync("git", ["rev-parse", `${commit}^{tree}`], {
      encoding: "utf-8",
      env: gitEnv,
    }).trim();

  const completedTree = treeOf(completed.id);

  await sendPrompt(page, "[fail] Add an opening hours table");
  const runs = await api.waitForRuns(project.id, 2);

  const failed = runs.find((run) =>
    run.request.prompt.startsWith("[fail]")
  ) as RunSummary;

  log("AC-14 failed run", {
    error: failed.error,
    status: failed.status,
    versionId: failed.versionId,
  });
  expect.soft(failed.status).toBe("failed");
  expect.soft(failed.versionId).toBeNull();
  expect
    .soft((await headVersion(api, project.id, main.id)).id)
    .toBe(completed.id);
  expect.soft(treeOf(completed.id)).toBe(completedTree);

  const versionPreview = await api.call<{ url: string }>(
    "GET",
    `/api/projects/${project.id}/versions/${completed.id}/preview`
  );

  expect.soft(await (await fetch(versionPreview.url)).text()).toContain(prompt);
  await expect.soft(page.locator(".status.failed")).toHaveCount(1);

  if ((await api.status(project.id, main.id)).dirty) {
    await page.getByRole("radio", { name: "Last completed" }).click();
    await expect.soft(frame.locator("h1")).toHaveText(prompt);
    await page.getByRole("radio", { exact: true, name: "Live" }).click();
    await page
      .locator(".banner")
      .getByRole("button", { name: "Discard" })
      .click();
  }

  await expect.poll(() => readFileSync(indexFile, "utf-8")).toBe(completedHtml);

  await sendPrompt(page, "[slow] Add a long event schedule");
  await expect
    .poll(() => readFileSync(indexFile, "utf-8") !== completedHtml, {
      intervals: [50],
      timeout: 15_000,
    })
    .toBe(true);
  await page.getByRole("button", { exact: true, name: "Stop" }).click();
  await expect
    .poll(
      async () =>
        (await api.runs(project.id)).find((run) =>
          run.request.prompt.startsWith("[slow]")
        )?.status
    )
    .toBe("canceled");
  expect
    .soft((await headVersion(api, project.id, main.id)).id)
    .toBe(completed.id);
  expect.soft(treeOf(completed.id)).toBe(completedTree);
  await page.getByRole("radio", { name: "Last completed" }).click();
  await expect.soft(frame.locator("h1")).toHaveText(prompt);
  await page.getByRole("radio", { exact: true, name: "Live" }).click();
  await page
    .locator(".banner")
    .getByRole("button", { name: "Discard" })
    .click();
  await expect.poll(() => readFileSync(indexFile, "utf-8")).toBe(completedHtml);
  const versions = await api.versions(project.id, main.id);
  log(
    "AC-14 versions after fail+cancel",
    versions.map((version) => [version.id.slice(0, 7), version.meta.kind])
  );
  expect.soft(versions.map((version) => version.id)).toContain(completed.id);
});

test("aC-16 (settings API): all settings are accepted on create and can change later", async ({
  page,
}) => {
  const api = await openHome(page);

  const created = await api.call<{ project: Project }>(
    "POST",
    "/api/projects",
    {
      kind: "html",
      prompt: "Settings probe",
      settings: {
        allowBash: true,
        allowInstall: true,
        maxBudgetUsd: 0.25,
        maxTurns: 5,
        model: "claude-haiku-5-5",
      },
    }
  );

  await api.waitForRuns(created.project.id, 1);
  const stored = (await api.project(created.project.id)).settings;
  log("AC-16 stored settings", stored);
  expect.soft(stored).toEqual({
    allowBash: true,
    allowInstall: true,
    defaultLevel: "prototype",
    disabledSkills: [],
    maxBudgetUsd: 0.25,
    maxTurns: 5,
    model: "claude-haiku-5-5",
  });
  const route = `${BASE_URL}/api/projects/${created.project.id}/settings`;

  const patch = (body: unknown) =>
    fetch(route, {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-studio-token": api.token,
      },
      method: "PATCH",
    });

  const ok = await patch({
    allowBash: false,
    allowInstall: false,
    maxTurns: 9,
  });

  expect.soft(ok.status).toBe(200);
  expect.soft((await api.project(created.project.id)).settings).toEqual({
    allowBash: false,
    allowInstall: false,
    defaultLevel: "prototype",
    disabledSkills: [],
    maxBudgetUsd: 0.25,
    maxTurns: 9,
    model: "claude-haiku-5-5",
  });
  expect.soft((await patch({ maxBudgetUsd: 100 })).status).toBe(400);
  expect.soft((await patch({ allowBash: "yes" })).status).toBe(400);
});

test("aC-08: restart keeps designs, history and settings", async ({ page }) => {
  const api = await openHome(page);

  const settings = {
    maxBudgetUsd: 0.75,
    maxTurns: 7,
    model: "claude-haiku-5-5",
  };

  const { project } = await api.call<{ project: Project }>(
    "POST",
    "/api/projects",
    { kind: "html", prompt: "Restart Settings Studio", settings }
  );

  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  await api.call("POST", `/api/projects/${project.id}/d/${main.id}/runs`, {
    mode: "edit",
    prompt: "Second pass copy",
  });
  await api.waitForRuns(project.id, 2);

  const head =
    (await api.project(project.id)).directions[0]?.headVersionId ?? "";

  const alt = await api.call<{ id: string }>(
    "POST",
    `/api/projects/${project.id}/directions`,
    { fromVersionId: head, name: "Alt" }
  );

  await api.call("POST", `/api/projects/${project.id}/d/${alt.id}/runs`, {
    mode: "edit",
    prompt: "Alt copy",
  });
  await api.waitForRuns(project.id, 3);

  const indexHtml = readFileSync(
    path.join(main.workTree, "index.html"),
    "utf-8"
  );

  const snapshot = async (client: StudioApi) => {
    const current = await client.project(project.id);
    const versions: Record<string, Version[]> = {};

    for (const direction of current.directions) {
      versions[direction.id] = await client.versions(project.id, direction.id);
    }
    const runs = (await client.runs(project.id)).map((run) => ({
      finalText: run.finalText,
      id: run.id,
      prompt: run.request.prompt,
      sessionId: run.sessionId,
      status: run.status,
      versionId: run.versionId,
    }));

    return { project: current, runs, versions };
  };

  const before = await snapshot(api);
  expect.soft(before.project.settings).toMatchObject(settings);

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
  const { pid } = await startServer(state.dataDir);
  writeState({ ...state, pid });

  await page.goto("/");

  const token =
    (await page.locator('meta[name="studio-token"]').getAttribute("content")) ??
    "";

  const fresh = new StudioApi(token);
  const after = await snapshot(fresh);
  log("AC-08 settings after restart", after.project.settings);
  expect.soft(after).toEqual(before);
  expect
    .soft(readFileSync(path.join(main.workTree, "index.html"), "utf-8"))
    .toBe(indexHtml);
  await page.evaluate(
    (pid) =>
      localStorage.setItem(
        "design-studio.ui.v1",
        JSON.stringify({ activeProjectId: pid })
      ),
    project.id
  );
  await page.reload();
  await expect
    .soft(page.locator(".topbar"))
    .toContainText("Restart Settings Studio");
  await expect
    .soft(page.locator(".msg.user .msg-body").first())
    .toHaveText("Restart Settings Studio");
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Restart Settings Studio");
});
