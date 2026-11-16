import { copy } from "./copy.js";
import type { RunRequest } from "./deps.js";

const POLISH_REQUEST: RunRequest = {
  level: "polish",
  mode: "edit",
  prompt: copy.polishPrompt,
};

export { POLISH_REQUEST };
