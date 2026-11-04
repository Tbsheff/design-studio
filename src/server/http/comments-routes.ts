import type { Context, Hono } from "hono";

import { COMMENT_TEXT_MAX } from "../../shared/comments.js";
import type { Direction, Project } from "../../shared/contracts.js";
import type { RunWatcher } from "../comments/run-watch.js";
import { BadRequestError } from "../platform/errors/index.js";
import { z } from "../platform/zod-bridge/index.js";
import type { CommentStore } from "../store/comments.js";

export { withCommentInputs } from "../comments/run-payload.js";

const textSchema = z
  .string()
  .trim()
  .min(1, "text is required")
  .max(COMMENT_TEXT_MAX);

const authorSchema = z.string().trim().min(1).max(60);

const replySchema = z
  .object({ text: textSchema, author: authorSchema.optional() })
  .strict();

interface CommentRouteDeps {
  comments: CommentStore;
  watcher: RunWatcher;
  loadDirection: (
    pid: string,
    did: string
  ) => Promise<{ project: Project; direction: Direction }>;
}

async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const raw = (await c.req.text()).trim();
  let json: unknown = {};
  if (raw !== "") {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new BadRequestError("body must be JSON");
    }
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BadRequestError(
      issue
        ? `${issue.path.join(".") || "body"}: ${issue.message}`
        : "invalid body"
    );
  }
  return parsed.data;
}

export function registerCommentRoutes(app: Hono, deps: CommentRouteDeps): void {
  const { comments, watcher } = deps;
  const base = "/api/projects/:pid/d/:did/comments";

  app.get(base, async (c) => {
    const { project, direction } = await deps.loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    const list = await comments.list(project.id, direction.id);
    if (list.some((comment) => comment.status === "sent")) {
      await watcher.reconcile(project.id, direction.id, list);
      return c.json(await comments.list(project.id, direction.id));
    }
    return c.json(list);
  });

  app.post(`${base}/:cid/replies`, async (c) => {
    const { text, author } = await parseBody(c, replySchema);
    const { project, direction } = await deps.loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    return c.json(
      await comments.addReply(
        project.id,
        direction.id,
        c.req.param("cid"),
        text,
        author
      )
    );
  });
}
