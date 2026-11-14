import { Layer } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { RouteSourceStore } from "../../project-ops/index.js";
import { PortMatchStore } from "../../review/index.js";
import { RunLogWriter } from "../../run-log/index.js";
import { DirectEditWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";

const PortLive = Layer.mergeAll(
  DirectEditWriter.layer,
  McpReadStore.layer,
  PortMatchStore.layer,
  ProjectStore.layer,
  RouteSourceStore.layer.pipe(Layer.provide(ProjectStore.layer)),
  RunLogWriter.layer
);

export { PortLive };
