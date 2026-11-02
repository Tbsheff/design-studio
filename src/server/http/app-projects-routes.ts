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
import { BadRequestError, ConflictError } from "../store/errors.js";
import type { AppContext } from "./app-context.js";
import { resolvePack } from "./app-project-files.js";
import { optionalString, readBody, requireString } from "./app-request.js";
import { finishAttach } from "./app-routes.js";
import { parseLevel, parseSettings, parseStartRun } from "./app-run-parse.js";

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
      return c.json({ moved, failed });
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

export { registerProjectsRoutes };
