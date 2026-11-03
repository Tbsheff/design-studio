import { Effect, Schema } from "effect";

import { requirePerm } from "../http/groups/authorizer.js";
import { CurrentKey } from "../http/middleware/current-key.js";
import { BadRequest } from "../shared-actions.js";
import { AgentRequestRepo } from "../tenant/repos/agent-request.js";
import type { AgentRequestKind } from "../tenant/repos/agent-request.js";
import { ProjectsRepo } from "../tenant/repos/projects.js";
import { VersionsRepo } from "../tenant/repos/versions.js";
import { CommentQueries } from "./comment-queries.js";

type Permission = Parameters<typeof requirePerm>[0];

const PAGE_DEFAULT = 50;

const PageFields = {
  cursor: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(Schema.Int),
};

const ListProjectsInput = Schema.Struct(PageFields);

const ListCommentsInput = Schema.Struct({
  ...PageFields,
  projectId: Schema.String,
});

const ListVersionsInput = Schema.Struct({
  ...PageFields,
  directionId: Schema.String,
});

const AddCommentInput = Schema.Struct({
  body: Schema.String,
  projectId: Schema.String,
});

const PublishDesignInput = Schema.Struct({
  note: Schema.optionalKey(Schema.String),
  projectId: Schema.String,
  slug: Schema.optionalKey(Schema.String),
});

const ShareDesignInput = Schema.Struct({
  canComment: Schema.optionalKey(Schema.Boolean),
  projectId: Schema.String,
});

type ToolRun = (args: unknown) => Effect.Effect<unknown, unknown, unknown>;

interface ToolListing {
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly name: string;
}

interface ToolDefinition {
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly name: string;
  readonly needs: Permission;
  readonly run: ToolRun;
}

const pageSchema = {
  cursor: { type: "string" },
  limit: { maximum: 100, minimum: 1, type: "integer" },
};

const toSchema = (
  properties: Readonly<Record<string, unknown>>,
  required: readonly string[]
): Readonly<Record<string, unknown>> => ({
  properties,
  required,
  type: "object",
});

const decode = <Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>,
  args: unknown
): Effect.Effect<Schema.Struct.Type<Fields>, BadRequest> =>
  Schema.decodeUnknownEffect(schema)(args ?? {}).pipe(
    Effect.mapError(
      () => new BadRequest({ message: "The tool arguments are not valid." })
    )
  );

const listProjects = Effect.fn("McpTool.list_projects")(function* run(
  args: unknown
) {
  const input = yield* decode(ListProjectsInput, args);
  const repo = yield* ProjectsRepo;

  const page = yield* repo.list(
    input.cursor ?? null,
    input.limit ?? PAGE_DEFAULT
  );

  return {
    cursor: page.cursor,
    items: page.items.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      updatedAt: row.updated_at,
    })),
  };
});

const listComments = Effect.fn("McpTool.list_comments")(function* run(
  args: unknown
) {
  const input = yield* decode(ListCommentsInput, args);
  const projects = yield* ProjectsRepo;
  const comments = yield* CommentQueries;

  yield* projects.get(input.projectId);

  const rows = yield* comments.list(
    input.projectId,
    input.cursor ?? null,
    input.limit ?? PAGE_DEFAULT
  );

  return {
    items: rows.map((row) => ({
      authorId: row.author_id,
      body: row.body,
      createdAt: row.created_at,
      id: row.id,
      isResolved: row.resolved_at !== null,
    })),
  };
});

const listVersions = Effect.fn("McpTool.list_versions")(function* run(
  args: unknown
) {
  const input = yield* decode(ListVersionsInput, args);
  const versions = yield* VersionsRepo;

  const page = yield* versions.listVersions(
    input.directionId,
    input.cursor ?? null,
    input.limit ?? PAGE_DEFAULT
  );

  return {
    cursor: page.cursor,
    items: page.items.map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      message: row.message,
      parentVersionId: row.parent_version_id,
    })),
  };
});

const addComment = Effect.fn("McpTool.add_comment")(function* run(
  args: unknown
) {
  const input = yield* decode(AddCommentInput, args);
  const key = yield* CurrentKey;
  const projects = yield* ProjectsRepo;
  const comments = yield* CommentQueries;

  yield* projects.get(input.projectId);

  const id = yield* comments.add({
    authorId: key.actingUserId,
    body: input.body,
    projectId: input.projectId,
  });

  return { id };
});

const requestApproval = Effect.fn("McpTool.requestApproval")(function* run(
  requestKind: AgentRequestKind,
  projectId: string,
  payload: unknown
) {
  const key = yield* CurrentKey;
  const projects = yield* ProjectsRepo;
  const requests = yield* AgentRequestRepo;

  yield* projects.get(projectId);

  const text = JSON.stringify(payload);

  const created = yield* requests.create({
    actingUserId: key.actingUserId,
    keyId: key.keyId,
    kind: requestKind,
    payload: text,
    projectId,
  });

  return {
    expiresAt: created.expiresAt,
    requestId: created.id,
    status: "pending",
  };
});

const publishDesign = Effect.fn("McpTool.publish_design")(function* run(
  args: unknown
) {
  const input = yield* decode(PublishDesignInput, args);

  return yield* requestApproval("publish", input.projectId, {
    note: input.note ?? null,
    slug: input.slug ?? null,
  });
});

const shareDesign = Effect.fn("McpTool.share_design")(function* run(
  args: unknown
) {
  const input = yield* decode(ShareDesignInput, args);

  return yield* requestApproval("share", input.projectId, {
    canComment: input.canComment === true,
  });
});

const TOOLS: readonly ToolDefinition[] = [
  {
    description: "List the projects in the organization.",
    inputSchema: toSchema(pageSchema, []),
    name: "list_projects",
    needs: "project.read",
    run: listProjects,
  },
  {
    description: "List the comments on one project.",
    inputSchema: toSchema({ ...pageSchema, projectId: { type: "string" } }, [
      "projectId",
    ]),
    name: "list_comments",
    needs: "comment.read",
    run: listComments,
  },
  {
    description: "List the versions of one direction.",
    inputSchema: toSchema({ ...pageSchema, directionId: { type: "string" } }, [
      "directionId",
    ]),
    name: "list_versions",
    needs: "project.read",
    run: listVersions,
  },
  {
    description: "Add a comment to a project.",
    inputSchema: toSchema(
      { body: { type: "string" }, projectId: { type: "string" } },
      ["body", "projectId"]
    ),
    name: "add_comment",
    needs: "comment.write",
    run: addComment,
  },
  {
    description:
      "Ask to publish a project. A person must approve the request within 24 hours.",
    inputSchema: toSchema(
      {
        note: { type: "string" },
        projectId: { type: "string" },
        slug: { type: "string" },
      },
      ["projectId"]
    ),
    name: "publish_design",
    needs: "project.publish",
    run: publishDesign,
  },
  {
    description:
      "Ask to share a project. A person must approve the request within 24 hours.",
    inputSchema: toSchema(
      { canComment: { type: "boolean" }, projectId: { type: "string" } },
      ["projectId"]
    ),
    name: "share_design",
    needs: "project.share",
    run: shareDesign,
  },
];

const callTool = Effect.fn("McpTool.call")(function* run(
  name: string,
  args: unknown
) {
  const tool = TOOLS.find((entry) => entry.name === name) ?? null;

  if (tool === null) {
    return yield* new BadRequest({ message: "The tool does not exist." });
  }

  yield* requirePerm(tool.needs);

  return yield* tool.run(args);
});

const listTools = (): readonly ToolListing[] =>
  TOOLS.map((tool) => ({
    description: tool.description,
    inputSchema: tool.inputSchema,
    name: tool.name,
  }));

export { callTool, listTools, TOOLS };

export type { ToolDefinition, ToolListing };
