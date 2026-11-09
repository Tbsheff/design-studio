import { Effect } from "effect";

import { toBody } from "../../direct-edit/index.js";
import type { DirectEditWriterApi } from "../../share/index.js";
import type { LayerText } from "./text-rewrite-layer.js";
import type { RunCommand } from "./text-rewrite-model.js";

const TAG_NAME = /^[a-z][a-z0-9-]*$/u;

const toTarget = (
  tag: string
): { readonly component: string } | { readonly tag: string } => {
  if (TAG_NAME.test(tag)) {
    return { tag };
  }

  return { component: tag };
};

const applyOption = Effect.fn("TextRewrite.applyOption")(function* run(
  writer: DirectEditWriterApi,
  command: RunCommand,
  layer: LayerText,
  option: string
) {
  const edit = {
    directionId: command.directionId,
    hints: { text: layer.text },
    projectId: command.projectId,
    selector: "",
    source: {
      col: command.layer.column,
      file: command.layer.file,
      line: command.layer.line,
    },
    text: option,
    ...toTarget(layer.tag),
  };

  const outcome = yield* writer.apply(
    { directionId: command.directionId, projectId: command.projectId },
    toBody(edit)
  );

  return outcome.version?.id ?? null;
});

export { applyOption };
