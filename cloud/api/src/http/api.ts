import { Layer } from "effect";
import { HttpApi, HttpApiBuilder } from "effect/http-api";

import {
  agentRequestHandlers,
  AgentRequestGroup,
} from "./groups/agent-request.js";
import { CommentsGroup, commentsHandlers } from "./groups/comments.js";
import { GatesLive } from "./groups/gates.js";
import { KeysGroup, keysHandlers } from "./groups/keys.js";
import { ProjectsGroup, projectsHandlers } from "./groups/projects.js";

const StudioApi = HttpApi.make("studio")
  .add(ProjectsGroup)
  .add(CommentsGroup)
  .add(KeysGroup)
  .add(AgentRequestGroup);

const ProjectsApiLive = HttpApiBuilder.group(
  StudioApi,
  "projects",
  projectsHandlers
);

const CommentsApiLive = HttpApiBuilder.group(
  StudioApi,
  "comments",
  commentsHandlers
);

const KeysApiLive = HttpApiBuilder.group(StudioApi, "keys", keysHandlers);

const AgentRequestApiLive = HttpApiBuilder.group(
  StudioApi,
  "agent_request",
  agentRequestHandlers
);

const GroupsApiLive = Layer.mergeAll(
  ProjectsApiLive,
  CommentsApiLive,
  KeysApiLive,
  AgentRequestApiLive
).pipe(Layer.provide(GatesLive));

const StudioApiLive = HttpApiBuilder.layer(StudioApi).pipe(
  Layer.provide(GroupsApiLive)
);

export { GroupsApiLive, StudioApi, StudioApiLive };
