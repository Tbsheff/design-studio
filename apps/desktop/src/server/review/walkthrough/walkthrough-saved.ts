import path from "node:path";

import { WalkthroughSchema } from "@design-studio/actions/walkthrough/schema";
import { Schema } from "effect";

import { toJsonFileReader } from "../../platform/local-file/index.js";

const SavedWalkthroughSchema = Schema.Struct({
  frameId: Schema.String,
  model: Schema.String,
  result: WalkthroughSchema,
  task: Schema.String,
});

const WALKTHROUGH_FOLDER = path.join("checks", "walkthroughs");

const toRelativeFolder = (walkthroughId: string): string =>
  path.join(WALKTHROUGH_FOLDER, walkthroughId);

const toFolder = (projectDir: string, walkthroughId: string): string =>
  path.join(projectDir, toRelativeFolder(walkthroughId));

const toSavedPath = (projectDir: string, walkthroughId: string): string =>
  path.join(toFolder(projectDir, walkthroughId), "walkthrough.json");

const readSavedWalkthrough = toJsonFileReader(SavedWalkthroughSchema);

export {
  readSavedWalkthrough,
  SavedWalkthroughSchema,
  toFolder,
  toRelativeFolder,
  toSavedPath,
};
