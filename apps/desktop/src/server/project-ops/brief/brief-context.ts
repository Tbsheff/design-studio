import type { Project } from "@design-studio/contracts";
import { Effect } from "effect";

import { listAppRoutes } from "../../app/index.js";
import { loadLibrary } from "../../components/index.js";

const MAIN_DIRECTION = "main";

const toWorkTree = (project: Project): string | null => {
  const direction =
    project.directions.find((item) => item.id === MAIN_DIRECTION) ??
    project.directions.at(0) ??
    null;

  if (direction === null) {
    return null;
  }

  return String(direction.workTree);
};

const toRoutes = Effect.fn("Brief.toRoutes")(function* run(
  project: Project,
  workTree: string
) {
  if (!project.app) {
    return [];
  }

  const { appDir } = project.app;

  const routes = yield* Effect.tryPromise({
    catch: (error) => error,
    try: () => listAppRoutes(workTree, String(appDir)),
  });

  return routes.map((item) => item.route);
});

const toKit = Effect.fn("Brief.toKit")(function* run(
  project: Project,
  workTree: string
) {
  if (project.kind !== "react") {
    return [];
  }

  const library = yield* Effect.tryPromise({
    catch: (error) => error,
    try: () => loadLibrary(project, workTree),
  });

  return [...new Set(library.entries.map((entry) => entry.name))];
});

const toBriefContext = Effect.fn("Brief.toBriefContext")(function* run(
  project: Project,
  designMd: string | null
) {
  const workTree = toWorkTree(project);

  if (workTree === null) {
    return { designMd, kit: [], routes: [] };
  }

  const routes = yield* toRoutes(project, workTree).pipe(
    Effect.orElseSucceed(() => [])
  );

  const kit = yield* toKit(project, workTree).pipe(
    Effect.orElseSucceed(() => [])
  );

  return { designMd, kit, routes };
});

export { toBriefContext };
