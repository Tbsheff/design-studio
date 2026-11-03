import type { Hono } from "hono";

import { bindContentRuntime } from "../content/content-runtime.js";
import { bindDirectEditRuntime } from "../direct-edit/direct-edit-core.js";
import type { AppContext } from "./app-context.js";
import { listWorkTree } from "./mentions.js";

const registerDirectEditRoutes = (_app: Hono, ctx: AppContext): void => {
  const {
    config,
    editDeps,
    loadDirection,
    preview,
    watchTokenSources,
    withDirection,
  } = ctx;

  bindContentRuntime({ editDeps, withDirection });
  bindDirectEditRuntime(config.dataDir, {
    editDeps,
    listWorkTree,
    loadDirection,
    preview,
    watchTokenSources,
    withDirection,
  });
};

export { registerDirectEditRoutes };
