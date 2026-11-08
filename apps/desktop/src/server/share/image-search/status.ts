import { IMAGE_SEARCH_SETTING, imageSearchEnv } from "./deps.js";
import type { Project } from "./deps.js";
import { IMAGE_SEARCH_OFF, isImageSearchOn } from "./gate.js";

interface ImageSearchStatus {
  readonly env: boolean;
  readonly message: string | null;
  readonly on: boolean;
  readonly setting: boolean;
}

const isSettingOn = (project: Project): boolean =>
  Object.entries(project.settings).some(
    ([key, value]) => key === IMAGE_SEARCH_SETTING && value === true
  );

const toImageSearchStatus = (project: Project): ImageSearchStatus => {
  const on = isImageSearchOn(project);
  const env = imageSearchEnv().trim().toLowerCase() === "on";
  const setting = isSettingOn(project);

  let message: string | null = IMAGE_SEARCH_OFF;

  if (on) {
    message = null;
  }

  return { env, message, on, setting };
};

export { toImageSearchStatus };

export type { ImageSearchStatus };
