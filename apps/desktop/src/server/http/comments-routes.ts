import {
  AuthorSchema,
  CommentTextSchema,
} from "@design-studio/actions/comment/schema";
import type { Direction, Project } from "@design-studio/contracts";
import { Result, Schema } from "effect";
import type { Context, Hono } from "hono";

import type { RunWatcher } from "../comments/run-watch.js";
import { toDecoder } from "../platform/decode/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import type { CommentStore } from "../store/comments.js";

export { withCommentInputs } from "../comments/run-payload.js";

const replyBodySchema = Schema.Struct({
  author: Schema.optionalKey(AuthorSchema),
  text: CommentTextSchema,
});

const decodeReplyBody = toDecoder(replyBodySchema, "error");

interface CommentRouteDeps {
  comments: CommentStore;
  watcher: RunWatcher;
  loadDirection: (
    pid: string,
    did: string
  ) => Promise<{ project: Project; direction: Direction }>;
}

async function parseBody(c: Context): Promise<{
  author: string | undefined;
  text: string;
}> {
  const raw = (await c.req.text()).trim();
  let json: unknown = {};
  if (raw !== "") {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new BadRequestError("body must be JSON");
    }
  }
  const parsed = decodeReplyBody(json);
  if (Result.isFailure(parsed)) {
    throw new BadRequestError(`invalid body: ${parsed.failure.message}`);
  }
  return { author: parsed.success.author, text: parsed.success.text };
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
    const { text, author } = await parseBody(c);
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
