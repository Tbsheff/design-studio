import path from "node:path";

import { Effect } from "effect";

import { findTextSource } from "../../direct-edit/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import { readTextFile } from "../../platform/local-file/index.js";
import type { RewriteLayer } from "./text-rewrite-model.js";

const VOICE_FILE = "docs/voice.md";

const TRANSLATION_FILE = /\.json$/iu;

const isTranslationText = Effect.fn("TextRewrite.isTranslationText")(
  function* run(workTree: string, layer: RewriteLayer) {
    const lookup = yield* attemptKnown(() =>
      findTextSource(
        { previewOrigin: null, workTree },
        { col: layer.column, file: layer.file, line: layer.line },
        null
      )
    );

    if (!("hit" in lookup)) {
      return false;
    }

    return TRANSLATION_FILE.test(lookup.hit.relative);
  }
);

const getVoiceGuide = Effect.fn("TextRewrite.getVoiceGuide")(function* run(
  workTree: string
) {
  const text = yield* readTextFile(path.join(workTree, VOICE_FILE));

  if (text === null || text.trim() === "") {
    return null;
  }

  return text;
});

export { getVoiceGuide, isTranslationText };
