import { withoutAnswers } from "@design-studio/contracts/clarify";
import { nameFromPrompt, slugify } from "@design-studio/contracts/folders";
import { Duration, Effect } from "effect";

import { loadConfig } from "../platform/config/index.js";
import { runCompletionAnswer } from "./completion/index.js";
import { toFolderSlug } from "./engine/to-folder-slug.js";

const FOLDER_NAME_MODEL = "claude-haiku-5-5";

const FOLDER_NAME_TIMEOUT_SECONDS = 4;

const FOLDER_NAME_TIMEOUT = Duration.seconds(FOLDER_NAME_TIMEOUT_SECONDS);

const FOLDER_NAME_BUDGET_USD = 0.01;

const FOLDER_NAME_TOKENS = 12;

const PROMPT_CHARS = 600;

const FOLDER_NAME_SYSTEM =
  "You name project folders. Reply with 2 or 3 lowercase words joined by hyphens that name the project. Reply with the name only. No quotes, no path, no extension.";

const toFallbackSlug = (prompt: string): string =>
  slugify(nameFromPrompt(prompt));

const toModelSlug = Effect.fn("FolderName.toModelSlug")(function* run(
  prompt: string
) {
  const answer = yield* runCompletionAnswer({
    budgetUsd: FOLDER_NAME_BUDGET_USD,
    maxTokens: FOLDER_NAME_TOKENS,
    model: FOLDER_NAME_MODEL,
    prompt: withoutAnswers(prompt).slice(0, PROMPT_CHARS),
    system: FOLDER_NAME_SYSTEM,
  });

  return toFolderSlug(answer.text);
});

const toProjectFolderName = Effect.fn("FolderName.toProjectFolderName")(
  function* run(prompt: string) {
    const fallback = toFallbackSlug(prompt);

    if (loadConfig().agentMode === "mock") {
      return fallback;
    }

    const named = yield* toModelSlug(prompt).pipe(
      Effect.timeout(FOLDER_NAME_TIMEOUT),
      Effect.orElseSucceed(() => null)
    );

    return named ?? fallback;
  }
);

export { toProjectFolderName };
