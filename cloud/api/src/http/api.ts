import { Layer } from "effect";
import { HttpApi, HttpApiBuilder } from "effect/http-api";

import { GatesLive } from "./groups/gates.js";
import { ProjectsGroup, projectsHandlers } from "./groups/projects.js";

const StudioApi = HttpApi.make("studio").add(ProjectsGroup);

const ProjectsApiLive = HttpApiBuilder.group(
  StudioApi,
  "projects",
  projectsHandlers
);

const GroupsApiLive = ProjectsApiLive.pipe(Layer.provide(GatesLive));

const StudioApiLive = HttpApiBuilder.layer(StudioApi).pipe(
  Layer.provide(GroupsApiLive)
);

export { GroupsApiLive, StudioApi, StudioApiLive };
