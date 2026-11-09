import type { Input } from "@design-studio/actions/_core/action";
import type { startDevServer } from "@design-studio/actions/dev-server/start";
import { Effect } from "effect";

import { DevServerRunner } from "../../app/index.js";
import { RepoCloneRunner } from "../../project-ops/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type StartDevServerInput = Input<typeof startDevServer>;

const handle = Effect.fn("dev-server.start")(function* run(
  input: StartDevServerInput
) {
  const service = yield* DevServerRunner;
  const clones = yield* RepoCloneRunner;
  const projects = yield* ProjectStore;
  const project = yield* projects.get(input.projectId);
  const { imported } = project;
  const status = yield* service.control(input.projectId, "start");

  if (imported === null || status.state === "failed") {
    return status;
  }

  const notice = yield* clones.takeNotice(String(imported.sourcePath));

  if (notice === null) {
    return status;
  }

  return { ...status, message: notice };
}) satisfies Handle<typeof startDevServer>;

export { handle };
