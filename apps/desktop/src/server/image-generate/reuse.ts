import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";

const REUSE_PATTERN =
  /^(?<stem>[\w./-]+?)-[0-9a-f]{10}\.(?<ext>jpg|png|svg|webp)$/u;

const BLOCKED = new Set([".git", ".studio", "node_modules"]);

const INVALID = "reuse must be the asset path of an earlier generated image.";

const partsOf = (relative: string): readonly string[] => relative.split("/");

const isSafe = (relative: string): boolean =>
  !relative.startsWith("/") &&
  partsOf(relative).every((part) => part !== ".." && !BLOCKED.has(part));

const readReuse = async (
  workTree: string,
  relative: string
): Promise<ImageBytes> => {
  const match = REUSE_PATTERN.exec(relative);

  if (!match?.groups || !isSafe(relative)) {
    throw new BadRequestError(INVALID);
  }

  const root = await realpath(workTree);
  const file = path.join(root, ...partsOf(relative));

  if (!file.startsWith(root + path.sep)) {
    throw new BadRequestError(INVALID);
  }

  try {
    return {
      bytes: await readFile(file),
      ext: match.groups.ext ?? "png",
      stem: path.posix.basename(match.groups.stem ?? "gen-image"),
    };
  } catch {
    throw new BadRequestError("The reused image file does not exist.");
  }
};

export { readReuse };
