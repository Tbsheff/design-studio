import type { RewriteContext, RewriteRequest } from "../text-rewrite-model.js";
import { OPTION_COUNT } from "./to-mock-options.js";

const DESIGN_MD_CHARS = 3000;

const VOICE_CHARS = 3000;

const SEPARATOR = "---";

const REWRITE_SYSTEM = `You rewrite one piece of interface text. Reply with exactly ${OPTION_COUNT} options. Put a line with only --- between the options. Write no numbers, no quotes, no markdown and no preamble. Keep the meaning, the names and any placeholders. Use the project facts when they are given.`;

const toInstruction = (request: RewriteRequest): string => {
  if (request.mode === "shorten") {
    return "Make the text shorter. Keep the meaning.";
  }

  if (request.mode === "lengthen") {
    return "Make the text a little longer and more helpful.";
  }

  if (request.mode === "clarify") {
    return "Make the text clearer and simpler.";
  }

  if (request.mode === "voice") {
    return "Rewrite the text to match the voice guide.";
  }

  if (request.mode === "fix") {
    return "Fix the spelling and grammar. Change nothing else.";
  }

  return `Translate the text to the language with BCP 47 tag ${request.language ?? "en"}.`;
};

const toFact = (
  label: string,
  text: string | null,
  limit: number
): string | null => {
  if (text === null) {
    return null;
  }

  return `${label}:\n${text.slice(0, limit)}`;
};

const toRewritePrompt = (
  request: RewriteRequest,
  context: RewriteContext
): string => {
  const facts = [
    toFact("DESIGN.md", context.designMd, DESIGN_MD_CHARS),
    toFact("Voice guide", context.voice, VOICE_CHARS),
  ].filter((line): line is string => line !== null);

  return [toInstruction(request), `Text:\n${request.text}`, ...facts].join(
    "\n\n"
  );
};

const toBlocks = (answer: string): readonly string[] => {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of answer.split("\n")) {
    if (line.trim() === SEPARATOR) {
      blocks.push(current.join("\n"));
      current = [];
    } else {
      current.push(line);
    }
  }

  blocks.push(current.join("\n"));

  return blocks;
};

const toParsedOptions = (
  answer: string,
  original: string
): readonly string[] => {
  const options = toBlocks(answer).flatMap((block) => {
    const option = block.trim();

    if (option === "" || option === original.trim()) {
      return [];
    }

    return [option];
  });

  return [...new Set(options)];
};

export { REWRITE_SYSTEM, toParsedOptions, toRewritePrompt };
