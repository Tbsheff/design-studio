import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { TEXT_SEARCH_HITS_MAX } from "@design-studio/contracts/text-search";
import { Effect } from "effect";

import type { TextSearchStoreApi } from "../../style-scope/index.js";
import type { RunCommand } from "./text-rewrite-model.js";

const ANY_TEXT = ".+";

interface LayerText {
  readonly tag: string;
  readonly text: string;
}

const getLayerText = Effect.fn("TextRewrite.getLayerText")(function* run(
  store: TextSearchStoreApi,
  command: RunCommand
) {
  const { layer } = command;

  const found = yield* store.inspect({
    directionId: command.directionId,
    limit: TEXT_SEARCH_HITS_MAX,
    projectId: command.projectId,
    query: {
      caseSensitive: false,
      glob: layer.file,
      query: ANY_TEXT,
      regex: true,
      wholeWord: false,
    },
  });

  const hits = found.hits.filter(
    (hit) =>
      hit.kind === "text" &&
      hit.layer.file === layer.file &&
      hit.layer.line === layer.line &&
      hit.layer.col === layer.column
  );

  const first = hits.at(0) ?? null;

  if (first === null) {
    return yield* new BadRequest({
      message: "This layer has no text of its own. Select a text layer.",
    });
  }

  const result: LayerText = {
    tag: first.layer.tag,
    text: hits.map((hit) => hit.match).join(" "),
  };

  return result;
});

export { getLayerText };

export type { LayerText };
