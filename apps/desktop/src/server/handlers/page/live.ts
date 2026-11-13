import { Layer } from "effect";

import { PageMatchStore, PageMatchWriter } from "../../canvas/index.js";
import {
  RouteSourceStore,
  RouteSourceWriter,
} from "../../project-ops/index.js";
import { PageWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";

const RouteSourceLive = Layer.mergeAll(
  RouteSourceStore.layer,
  RouteSourceWriter.layer
).pipe(Layer.provide(ProjectStore.layer));

const PageLive = Layer.mergeAll(
  PageWriter.layer,
  PageMatchStore.layer,
  PageMatchWriter.layer,
  RouteSourceLive
);

export { PageLive };
