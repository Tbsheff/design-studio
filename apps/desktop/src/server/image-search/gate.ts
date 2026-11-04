import {
  IMAGE_SEARCH_ENV,
  IMAGE_SEARCH_SETTING,
  imageSearchEnv,
} from "./deps.js";
import type { Project } from "./deps.js";
import { ImageSearchError } from "./errors.js";

const IMAGE_SEARCH_OFF = `Image search is off. The studio does not connect to the image service. To turn it on, set ${IMAGE_SEARCH_ENV}=on before you start the studio, or set the project setting ${IMAGE_SEARCH_SETTING} to true.`;

const isEnvOn = (): boolean => imageSearchEnv().trim().toLowerCase() === "on";

const isSettingOn = (project: Project | null): boolean => {
  if (project === null) {
    return false;
  }

  return Object.entries(project.settings).some(
    ([key, value]) => key === IMAGE_SEARCH_SETTING && value === true
  );
};

const isImageSearchOn = (project: Project | null): boolean =>
  isEnvOn() || isSettingOn(project);

const requireImageSearch = (project: Project | null): void => {
  if (!isImageSearchOn(project)) {
    throw new ImageSearchError(IMAGE_SEARCH_OFF);
  }
};

export { IMAGE_SEARCH_OFF, isImageSearchOn, requireImageSearch };
