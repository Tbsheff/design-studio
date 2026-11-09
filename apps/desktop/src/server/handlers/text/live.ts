import { Layer } from "effect";

import { TextRewriteRunner } from "../../project-ops/index.js";
import { DirectEditWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import { TextSearchStore, TextSearchWriter } from "../../style-scope/index.js";

const TextRewriteLive = TextRewriteRunner.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      ProjectStore.layer,
      DirectEditWriter.layer,
      TextSearchStore.layer
    )
  )
);

const TextLive = Layer.mergeAll(
  TextSearchStore.layer,
  TextSearchWriter.layer,
  TextRewriteLive
);

export { TextLive };
