import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const WORDS_MAX = 2000;
const WORD_MAX = 60;
const SELECTORS_MAX = 20;
const SUGGESTIONS_MAX = 3;
const FRAME_MAX = 60;
const SPELLING_WORD_PATTERN = /^\p{L}[\p{L}'’-]*$/u;

const SpellingTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const SpellingFrameIdSchema = Schema.NullOr(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(FRAME_MAX))
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const SpellingWordSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(WORD_MAX),
  Schema.isPattern(SPELLING_WORD_PATTERN)
);

const SpellingWordsSchema = Schema.Array(SpellingWordSchema).check(
  Schema.isMaxLength(WORDS_MAX)
);

const SpellingHitSchema = Schema.Struct({
  count: Schema.Int,
  selectors: Schema.Array(Schema.String).check(
    Schema.isMaxLength(SELECTORS_MAX)
  ),
  suggestions: Schema.Array(SpellingWordSchema).check(
    Schema.isMaxLength(SUGGESTIONS_MAX)
  ),
  word: SpellingWordSchema,
});

const SpellingWordListSchema = Schema.Struct({
  words: SpellingWordsSchema,
});

const SpellingTotalsFields = {
  frameId: Schema.String,
  total: Schema.Int,
  wordList: SpellingWordListSchema,
} as const;

export {
  SPELLING_WORD_PATTERN,
  SpellingFrameIdSchema,
  SpellingHitSchema,
  SpellingTargetFields,
  SpellingTotalsFields,
  SpellingWordListSchema,
  SpellingWordSchema,
  SpellingWordsSchema,
};
