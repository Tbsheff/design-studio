import { Layer } from "effect";

import {
  ProjectOpsStore,
  ProjectOpsWriter,
  RepoCloneRunner,
  RouteSourceWriter,
} from "../../project-ops/index.js";
import {
  ProjectLibraryStore,
  ProjectLibraryWriter,
  ProjectStore,
  ProjectWriter,
  WorkspaceStore,
  WorkspaceWriter,
} from "../../store/index.js";

const ProjectLive = Layer.mergeAll(
  ProjectStore.layer,
  ProjectWriter.layer,
  ProjectOpsStore.layer,
  ProjectOpsWriter.layer,
  RepoCloneRunner.layer,
  RouteSourceWriter.layer.pipe(Layer.provide(ProjectStore.layer)),
  ProjectLibraryStore.layer,
  ProjectLibraryWriter.layer,
  WorkspaceStore.layer,
  WorkspaceWriter.layer
);

export { ProjectLive };
