import type { ThumbnailService } from "../../shared/server-ports.js";

const toUnavailable = <Result>(): Promise<Result> =>
  Promise.reject(new Error("Thumbnails are not available."));

const unavailableThumbnails: ThumbnailService = {
  diff: () => toUnavailable(),
  file: () => toUnavailable(),
  idle: () => Promise.resolve(),
  schedule: () => Promise.resolve(),
  version: () => toUnavailable(),
};

export { unavailableThumbnails };
