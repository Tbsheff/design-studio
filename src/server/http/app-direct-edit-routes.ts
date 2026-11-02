import type { Hono } from "hono";

import type { ArrangeResult } from "../../shared/arrange.js";
import type {
  DirectEditBatchResult,
  DirectEditResult,
  StructureEditResult,
} from "../../shared/contracts.js";
import { isStyleReplaceBody } from "../../shared/style-search.js";
import type { StyleReplaceResult } from "../../shared/style-search.js";
import { warmPropsTypes } from "../components/props-service.js";
import { appTokensFor } from "../design-system/app-tokens/source.js";
import {
  previewAppTokens,
  updateAppTokens,
} from "../design-system/app-tokens/write.js";
import { createToken } from "../design-system/create-token.js";
import { readDesignSystemState } from "../design-system/state.js";
import { previewTokens } from "../design-system/token-preview.js";
import { updateTokens } from "../design-system/update-tokens.js";
import { applyArrange, isArrangeBody } from "../direct-edit/arrange.js";
import { applyDirectEditBatch } from "../direct-edit/batch.js";
import { applyDirectEdit } from "../direct-edit/commit/apply.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { applyStyleReplace } from "../direct-edit/replace.js";
import { applyStructureEdit } from "../direct-edit/structure-apply.js";
import { isDirectEditBatch, isStructureEdit } from "../direct-edit/validate.js";
import { commitTweaks } from "../tweaks/commit.js";
import { readTweaksState } from "../tweaks/store.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { listWorkTree } from "./mentions.js";

const registerDirectEditRoutes = (app: Hono, ctx: AppContext): void => {
  const { editDeps, loadDirection, preview, watchTokenSources, withDirection } =
    ctx;

  app.get("/api/projects/:pid/d/:did/design-system", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );

    return c.json(await readDesignSystemState(project, direction));
  });

  app.post("/api/projects/:pid/d/:did/design-system/preview", async (c) => {
    const body = await readBody(c);

    try {
      const { project, direction } = await loadDirection(
        c.req.param("pid"),
        c.req.param("did")
      );

      watchTokenSources(project);
      const appTokens = await appTokensFor(project, direction);

      return c.json(
        appTokens
          ? previewAppTokens(appTokens, body)
          : await previewTokens(direction.workTree, body)
      );
    } catch (error) {
      if (error instanceof DirectEditError) {
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      }
      throw error;
    }
  });

  app.get("/api/projects/:pid/d/:did/tweaks", async (c) => {
    const { direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );

    return c.json(await readTweaksState(direction.workTree));
  });

  app.post("/api/projects/:pid/d/:did/tweaks/commit", async (c) => {
    const body = await readBody(c);

    try {
      const result = await withDirection(
        c.req.param("pid"),
        c.req.param("did"),
        (project, direction) => commitTweaks(editDeps, project, direction, body)
      );

      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) {
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      }
      throw error;
    }
  });

  app.post(
    "/api/projects/:pid/d/:did/design-system/tokens/update",
    async (c) => {
      const body = await readBody(c);

      try {
        const result = await withDirection(
          c.req.param("pid"),
          c.req.param("did"),
          async (project, direction) =>
            (await updateAppTokens(editDeps, project, direction, body)) ??
            updateTokens(editDeps, project, direction, body)
        );

        return c.json(result);
      } catch (error) {
        if (error instanceof DirectEditError) {
          return c.json(
            { error: error.code, message: error.message },
            error.status
          );
        }
        throw error;
      }
    }
  );

  app.post("/api/projects/:pid/d/:did/design-system/tokens", async (c) => {
    const body = await readBody(c);

    try {
      const result = await withDirection(
        c.req.param("pid"),
        c.req.param("did"),
        (project, direction) => createToken(editDeps, project, direction, body)
      );

      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) {
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      }
      throw error;
    }
  });

  app.post("/api/projects/:pid/d/:did/direct-edit", async (c) => {
    const body = await readBody(c);

    try {
      const result = await withDirection<
        | DirectEditResult
        | DirectEditBatchResult
        | StructureEditResult
        | StyleReplaceResult
        | ArrangeResult
      >(c.req.param("pid"), c.req.param("did"), (project, direction) =>
        isArrangeBody(body)
          ? applyArrange({ ...editDeps, preview }, project, direction, body)
          : isStyleReplaceBody(body)
            ? applyStyleReplace(editDeps, project, direction, body)
            : isStructureEdit(body)
              ? applyStructureEdit(editDeps, project, direction, body)
              : isDirectEditBatch(body)
                ? applyDirectEditBatch(editDeps, project, direction, body)
                : applyDirectEdit(editDeps, project, direction, body)
      );

      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) {
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      }
      throw error;
    }
  });

  app.get("/api/projects/:pid/d/:did/preview", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );

    const url = await preview.directionUrl(project, direction);
    warmPropsTypes(project, direction);

    return c.json({ url });
  });

  app.get("/api/projects/:pid/d/:did/tree", async (c) => {
    const { direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );

    return c.json({ files: await listWorkTree(direction.workTree) });
  });

  app.post("/api/projects/:pid/d/:did/check", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );

    return c.json(
      await preview.renderCheck(
        project,
        direction,
        project.app ? { appOnly: true } : undefined
      )
    );
  });
};

export { registerDirectEditRoutes };
