import { readFile } from "node:fs/promises";

import type { Hono } from "hono";

import type {
  Direction,
  Project,
  ProjectKind,
} from "../../shared/contracts.js";
import { nameFromPrompt } from "../../shared/folders.js";
import { searchProjects } from "../app/project-search.js";
import {
  captureReferencePage,
  parseReferenceUrls,
} from "../design-system/reference-page.js";
import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";
import { BadRequestError, ConflictError } from "../store/errors.js";
import { createProjectLibrary } from "../store/project-library.js";
import type { AppContext } from "./app-context.js";
import { resolvePack, resolveProjectFile } from "./app-project-files.js";
import { optionalString, readBody, requireString } from "./app-request.js";
import { finishAttach } from "./app-routes.js";
import { parseLevel, parseSettings, parseStartRun } from "./app-run-parse.js";
import { registerHomeRoutes } from "./home-routes.js";

const registerProjectsRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    addParentFolder,
    bus,
    commitInit,
    config,
    defaultFolder,
    directionLock,
    packs,
    prepareCreated,
    preview,
    projects,
    runner,
    runsDir,
    startRun,
    versions,
    watchDirection,
  } = ctx;

  const appRouteDeps = {
    commitInit: (project: Project) => commitInit(project),
    preview,
    projects,
    readBody,
    versions,
    watch: (project: Project, direction: Direction) =>
      watchDirection(project, direction),
  };

  bindMcpReadRuntime({ preview, projects, runsDir, versions });

  app.get("/api/projects", async (c) => c.json(await projects.list()));

  app.get("/api/project-search", async (c) =>
    c.json(
      await searchProjects(
        {
          appStatus: (p) => preview.apps?.status(p) ?? null,
          projects,
          runsDir,
        },
        {
          limit: Number(c.req.query("limit") ?? 20) || 20,
          projectId: c.req.query("project") ?? null,
          query: c.req.query("q") ?? "",
        }
      )
    )
  );

  app.post("/api/projects", async (c) => {
    const body = await readBody(c);
    const prompt = requireString(body, "prompt");
    const kind = (body.kind ?? "html") as ProjectKind;

    if (kind !== "html" && kind !== "react") {
      throw new BadRequestError("kind must be html or react");
    }

    const settings = parseSettings(body.settings);
    const designMd = optionalString(body, "designMd");
    const pack = await resolvePack(packs, body.packId);
    const level = parseLevel(body.level);
    const shouldStartRun = parseStartRun(body.startRun);
    const parentPath = optionalString(body, "parentPath");
    const name = optionalString(body, "name") ?? nameFromPrompt(prompt);

    const referenceUrls = parseReferenceUrls(
      body.referenceUrls,
      config.fetchAllowLoopback === true
    );

    const created = await projects.createInFolder({
      kind,
      name,
      parentPath: parentPath ?? (await defaultFolder.ensure()),
      settings,
    });

    await addParentFolder(parentPath, created);
    await versions.ensureRepo(created);
    const project = await prepareCreated(created, pack, designMd);
    const main = projects.mainDirection(project);
    watchDirection(project, main);

    if (!shouldStartRun) {
      return c.json({ project, runId: null });
    }

    const referencePages = await Promise.all(
      referenceUrls.map((url) =>
        captureReferencePage(url, config.fetchAllowLoopback === true)
      )
    );

    const runId = await startRun(project, main, {
      mode: "edit",
      prompt,
      ...(level ? { level } : {}),
      ...(referencePages.length > 0 ? { referencePages } : {}),
    });

    return c.json({ project, runId });
  });

  app.post("/api/projects/import", async (c) => {
    const body = await readBody(c);
    const appDir = optionalString(body, "appDir");

    const imported = await projects.importFolder(requireString(body, "path"), {
      ...(appDir ? { appDir } : {}),
      skipApp: body.skipApp === true,
    });

    if (imported.app) {
      return c.json(await finishAttach(appRouteDeps, imported));
    }

    await versions.ensureRepo(imported);
    const project = await commitInit(imported);
    watchDirection(project, projects.mainDirection(project));

    return c.json({ project });
  });

  app.get("/api/hidden-projects", async (c) => {
    const hidden = (await projects.list()).filter((project) =>
      projects.isHidden(project)
    );

    return c.json({
      count: hidden.length,
      target: await defaultFolder.current(),
    });
  });

  app.post("/api/hidden-projects/move", async (c) => {
    const hidden = (await projects.list()).filter((project) =>
      projects.isHidden(project)
    );

    const moved: string[] = [];
    const failed: { projectId: string; error: string }[] = [];

    if (hidden.length === 0) {
      return c.json({ failed, moved });
    }

    const target = await defaultFolder.ensure();

    for (const project of hidden) {
      const main = projects.mainDirection(project);

      try {
        const updated = await directionLock(
          `${project.id}/${main.id}`,
          async () => {
            if (
              project.directions.some((direction) =>
                runner.isRunning(project.id, direction.id)
              )
            ) {
              throw new ConflictError("run_in_progress");
            }

            await preview.release(project, main);
            const next = await projects.moveIntoFolder(project.id, target);
            await preview.release(next, main);

            return next;
          }
        );

        bus.emit({
          direction: projects.mainDirection(updated),
          directionId: main.id,
          projectId: project.id,
          type: "direction.updated",
        });
        moved.push(project.id);
      } catch (error) {
        console.error(`[http] could not move project ${project.id}`, error);
        failed.push({
          error: error instanceof Error ? error.message : String(error),
          projectId: project.id,
        });
      }
    }

    return c.json({ failed, moved });
  });
};

const registerProjectDetailRoutes = (app: Hono, ctx: AppContext): void => {
  const { commandRules, emitStatus, projects, recordVersion, versions } = ctx;

  app.get("/api/projects/:pid", async (c) =>
    c.json(await projects.get(c.req.param("pid")))
  );

  app.patch("/api/projects/:pid/settings", async (c) => {
    const pid = c.req.param("pid");
    await projects.get(pid);
    const patch = parseSettings(await readBody(c)) ?? {};
    const project = await projects.updateSettings(pid, patch);

    return c.json(project);
  });

  app.get("/api/projects/:pid/command-rules", async (c) => {
    const project = await projects.get(c.req.param("pid"));

    return c.json({ rules: await commandRules.list(project.id) });
  });

  app.post("/api/projects/:pid/command-rules/remove", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const rule = requireString(await readBody(c), "rule");

    return c.json({ rules: await commandRules.remove(project.id, rule) });
  });

  app.post("/api/projects/:pid/attachments", async (c) => {
    const pid = c.req.param("pid");
    const form = await c.req.parseBody();
    const { file } = form;

    if (!(file instanceof File)) {
      throw new BadRequestError('multipart field "file" is required');
    }
    const attachment = await projects.saveAttachment(pid, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type,
      name: file.name,
    });

    return c.json(attachment);
  });

  app.get("/api/projects/:pid/design-md", async (c) => {
    const content = await projects.readDesignMd(c.req.param("pid"));

    return c.json({ content: content ?? "" });
  });

  app.put("/api/projects/:pid/design-md", async (c) => {
    const body = await readBody(c);
    const { content } = body;

    if (typeof content !== "string") {
      throw new BadRequestError("content must be a string");
    }
    const pid = c.req.param("pid");
    await projects.writeDesignMd(pid, content);
    const project = await projects.get(pid);
    const main = projects.mainDirection(project);

    const version = await versions.commitFile(
      project,
      main,
      "DESIGN.md",
      "Update DESIGN.md",
      { kind: "manual" }
    );

    if (version) {
      await recordVersion(project, main, version);
    }
    await emitStatus(project, main);

    return c.json({ ok: true, versionId: version?.id ?? null });
  });

  app.get("/api/projects/:pid/files", async (c) => {
    const pid = c.req.param("pid");
    await projects.get(pid);

    const file = await resolveProjectFile(
      projects.projectDir(pid),
      c.req.query("path") ?? ""
    );

    const bytes = await readFile(file);

    return new Response(new Uint8Array(bytes), {
      headers: { "cache-control": "no-store", "content-type": "image/png" },
    });
  });
};

const registerHomeProjectRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    addParentFolder,
    commitInit,
    config,
    defaultFolder,
    preview,
    projects,
    runner,
    thumbnails,
    versions,
    watchDirection,
  } = ctx;
  registerHomeRoutes(app, {
    config,
    projects,
    versions,
    library: createProjectLibrary({
      config,
      projects,
      versions,
      preview,
      runner,
      defaultFolder: () => defaultFolder.ensure(),
    }),
    thumbnails,
    defaultFolder,
    readBody,
    commitInit,
    watch: (project) =>
      watchDirection(project, projects.mainDirection(project)),
    addParentFolder,
  });
};

export {
  registerHomeProjectRoutes,
  registerProjectDetailRoutes,
  registerProjectsRoutes,
};
