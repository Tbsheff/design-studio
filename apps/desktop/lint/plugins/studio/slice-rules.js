import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";
import { isChanged } from "./freeze-rules.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const ROADMAP = path.join(ROOT, "../../.claude/goal/roadmap.md");

const ACTIVE_SLICE = path.join(ROOT, "../../.claude/goal/active-slice");

const WAVE_TABLE = /```json\n(?<body>[\s\S]*?)\n```/u;

const TRAILING_COMMA = /,(?<close>\s*[}\]])/gu;

const SLICE_MESSAGE =
  "A change to a file outside the owned globs of the slice named in .claude/goal/active-slice is banned (L6), because then 2 slices can write one file and the merge step loses track. Use the slice's globs in Appendix A of .claude/goal/roadmap.md: add the path there before the slice runs, or leave the edit to the merge step.";

const cache = { active: null, slices: null };

const toActiveSlice = () => {
  if (cache.active === null) {
    cache.active = "";

    if (existsSync(ACTIVE_SLICE)) {
      cache.active = readFileSync(ACTIVE_SLICE, "utf-8").trim();
    }
  }

  return cache.active;
};

const parseWaves = () => {
  if (!existsSync(ROADMAP)) {
    return {};
  }

  const text = readFileSync(ROADMAP, "utf-8");
  const body = WAVE_TABLE.exec(text.slice(text.indexOf("## Appendix A")))?.groups?.body ?? "{}";

  try {
    return JSON.parse(body.replaceAll(TRAILING_COMMA, "$<close>"));
  } catch {
    return {};
  }
};

const toSliceGlobs = (slice) => {
  if (cache.slices === null) {
    cache.slices = parseWaves();
  }

  const split = slice.indexOf("/");
  const wave = cache.slices[slice.slice(0, split)] ?? {};

  return wave[slice.slice(split + 1)] ?? [];
};

const isGlobMatch = (file, glob) => glob === file || path.matchesGlob(file, glob);

const isOwned = (globs, file) => {
  const included = globs.filter((glob) => !glob.startsWith("!"));

  if (!included.some((glob) => isGlobMatch(file, glob))) {
    return false;
  }

  return !globs.some((glob) => glob.startsWith("!") && isGlobMatch(file, glob.slice(1)));
};

const sliceOwnedChange = rule((context) => ({
  Program: (program) => {
    const slice = toActiveSlice();
    const relative = relativeOf(context.filename);

    if (slice === "" || !isChanged(relative)) {
      return;
    }

    if (!isOwned(toSliceGlobs(slice), relative)) {
      context.report({ message: `${SLICE_MESSAGE} Slice: ${slice}.`, node: program });
    }
  },
}));

export { sliceOwnedChange };
