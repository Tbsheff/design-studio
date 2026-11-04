import type { Permission } from "@design-studio/actions/_core/permissions";
import { z } from "../../platform/zod-bridge/index.js";
import { LOCAL_ORG_ID, isOrgInScope, toOrgScope } from "../../store/index.js";
import { isPermitted } from "../../store/principal.js";
import type { Principal } from "../../store/principal.js";
import { EditError } from "../edit-guards.js";
import type { Done, ToolSpec } from "../edit-kit.js";
import { legacyCaller, lookupProjectOrg } from "./caller-scope.js";

const TOOL_PERMS = new Map<string, Permission>([
  ["attach_app", "project.create"],
  ["create_project", "project.create"],
  ["publish_design", "project.publish"],
  ["rollback_publication", "publication.update"],
  ["unpublish_design", "publication.delete"],
]);

type ToolArgs = Parameters<ToolSpec["run"]>[1];

const TargetSchema = z.object({
  body: z.string().optional(),
  projectId: z.string().optional(),
});

const COMMENT_WRITES = new Set(["reply_to_comment", "resolve_comment"]);
const UNTRUSTED_REPLY_TOOLS = new Set(["reply_to_comment"]);

const REPLY_HOLD_TEXT =
  "Held for approval: this reply answers a comment from outside your org.";

const toolPerm = (spec: ToolSpec): Permission => {
  const named = TOOL_PERMS.get(spec.name) ?? null;

  if (named !== null) {
    return named;
  }

  if (COMMENT_WRITES.has(spec.name)) {
    return "comment.write";
  }

  if (spec.meta.readOnly === true) {
    return "studio.read";
  }

  return "studio.write";
};

const forbidden = (perm: Permission): EditError =>
  new EditError(`403 forbidden: this key lacks ${perm}.`, "forbidden");

const notFound = (): EditError =>
  new EditError("404 not found: the project does not exist.", "not_found");

const checkPerm = (principal: Principal, perm: Permission): void => {
  if (!isPermitted(principal, perm)) {
    throw forbidden(perm);
  }
};

const checkProjectScope = async (
  principal: Principal,
  args: ToolArgs
): Promise<void> => {
  const projectId = TargetSchema.parse(args).projectId ?? null;

  if (principal.kind !== "key" || projectId === null) {
    return;
  }

  const orgId = (await lookupProjectOrg(projectId)) ?? LOCAL_ORG_ID;

  if (!isOrgInScope(toOrgScope(principal), orgId)) {
    throw notFound();
  }
};

const holdReply = async (
  spec: ToolSpec,
  deps: Parameters<ToolSpec["run"]>[0],
  args: ToolArgs,
  client: string
): Promise<void> => {
  if (!UNTRUSTED_REPLY_TOOLS.has(spec.name)) {
    return;
  }

  const target = TargetSchema.parse(args);

  const who = { client };

  const outcome = await deps.approvals.ask({
    ...who,
    action: "reply",
    detail: target.body ?? spec.name,
    projectId: target.projectId ?? null,
    title: "Reply to a comment",
    tool: spec.name,
  });

  if (outcome !== "allow") {
    throw new EditError(REPLY_HOLD_TEXT, "held");
  }
};

const guardTool = (spec: ToolSpec): ToolSpec => ({
  ...spec,
  run: async (deps, args, client): Promise<Done> => {
    const principal = legacyCaller();
    checkPerm(principal, toolPerm(spec));
    await checkProjectScope(principal, args);

    if (principal.kind === "key") {
      await holdReply(spec, deps, args, client);
    }

    return spec.run(deps, args, client);
  },
});

const guardTools = (tools: readonly ToolSpec[]): ToolSpec[] =>
  tools.map((tool) => guardTool(tool));

export { guardTool, guardTools, toolPerm };
