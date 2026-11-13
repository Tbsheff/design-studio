import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { ProjectStore } from "../../store/index.js";
import {
  getRecord,
  hasPage,
  toDirection,
  toEntryOf,
  toMainDirection,
} from "./route-source-file.js";

interface SourcePageCommand {
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

const toWorkTree = Effect.fn("RouteSource.toWorkTree")(function* run(
  projectId: string,
  directionId: string
) {
  const projects = yield* ProjectStore;
  const project = yield* projects.get(projectId);
  const direction = toDirection(project, directionId);

  if (direction === null) {
    return yield* new NotFound({
      message: `The direction ${directionId} does not exist.`,
    });
  }

  return direction.workTree;
});

const toAppWorkTree = Effect.fn("RouteSource.toAppWorkTree")(function* run(
  appProjectId: string
) {
  const projects = yield* ProjectStore;
  const app = yield* projects.get(appProjectId);
  const direction = toMainDirection(app);

  if (direction === null) {
    return yield* new NotFound({
      message: "The app of this route copy has no direction.",
    });
  }

  return { appDir: app.app?.appDir ?? ".", workTree: direction.workTree };
});

const toCopyOf = Effect.fn("RouteSource.toCopyOf")(function* run(
  command: SourcePageCommand
) {
  const workTree = yield* toWorkTree(command.projectId, command.directionId);

  if (!(yield* hasPage(workTree, command.file))) {
    return null;
  }

  const entry = toEntryOf(yield* getRecord(workTree), command.file);

  if (entry === null) {
    return null;
  }

  return { entry, workTree };
});

export { toAppWorkTree, toCopyOf, toWorkTree };

export type { SourcePageCommand };
