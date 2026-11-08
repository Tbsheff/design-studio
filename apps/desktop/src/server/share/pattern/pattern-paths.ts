import path from "node:path";

import { loadConfig } from "./deps.js";

const PATTERN_FOLDER = "patterns";

const JSON_SUFFIX = ".json";

const toPatternFolder = (): string =>
  path.join(loadConfig().dataDir, PATTERN_FOLDER);

const toPatternFile = (id: string): string =>
  path.join(toPatternFolder(), `${id}${JSON_SUFFIX}`);

export { JSON_SUFFIX, toPatternFile, toPatternFolder };
