import { Layer } from "effect";

import { AgentAuth } from "../http/middleware/agent-auth.js";
import { MemberDirectory } from "../http/middleware/member-directory.js";
import { TenantDb } from "../tenant/db.js";
import { AgentRequestRepo } from "../tenant/repos/agent-request.js";
import { CommentRepo } from "../tenant/repos/comments.js";
import { ProjectsRepo } from "../tenant/repos/projects.js";
import { VersionsRepo } from "../tenant/repos/versions.js";

const reposLayer = Layer.mergeAll(
  ProjectsRepo.layer,
  VersionsRepo.layer,
  AgentRequestRepo.layer,
  CommentRepo.layer
).pipe(Layer.provide(TenantDb.layer));

const mcpLayer = Layer.mergeAll(
  AgentAuth.layer.pipe(Layer.provide(MemberDirectory.layer)),
  reposLayer
);

export { mcpLayer };
