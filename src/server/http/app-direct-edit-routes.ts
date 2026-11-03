import path from "node:path";

import type { Hono } from "hono";

import {
  componentPreviewsFor,
  createComponentService,
} from "../components/index.js";
import { bindContentRuntime } from "../content/index.js";
import { bindDirectEditRuntime } from "../direct-edit/index.js";
import type { AppContext } from "./app-context.js";
import { listWorkTree } from "./mentions.js";

const registerDirectEditRoutes = (_app: Hono, ctx: AppContext): void => {
  const {
    config,
    editDeps,
    loadDirection,
    preview,
    projects,
    watchTokenSources,
    withDirection,
  } = ctx;

  bindContentRuntime({ editDeps, withDirection });
  bindDirectEditRuntime(config.dataDir, {
    components: createComponentService({
      preview,
      scratchDir: (projectId) =>
        path.join(projects.projectDir(projectId), ".component-shots"),
    }),
    editDeps,
    listWorkTree,
    loadDirection,
    preview,
    previews: componentPreviewsFor(
      preview,
      path.join(config.dataDir, "component-previews")
    ),
    watchTokenSources,
    withDirection,
  });
};

export { registerDirectEditRoutes };
