import { Layer } from "effect";

import {
  ProjectLibraryStore,
  ProjectLibraryWriter,
  ProjectStore,
  ProjectWriter,
  WorkspaceStore,
  WorkspaceWriter,
} from "../../store/index.js";

const ProjectsLive = Layer.mergeAll(
  ProjectStore.layer,
  ProjectWriter.layer,
  ProjectLibraryStore.layer,
  ProjectLibraryWriter.layer,
  WorkspaceStore.layer,
  WorkspaceWriter.layer
);

export { ProjectsLive };
