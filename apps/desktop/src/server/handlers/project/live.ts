import { Layer } from "effect";

import {
  ProjectOpsStore,
  ProjectOpsWriter,
  RepoCloneRunner,
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
  ProjectLibraryStore.layer,
  ProjectLibraryWriter.layer,
  WorkspaceStore.layer,
  WorkspaceWriter.layer
);

export { ProjectLive };
