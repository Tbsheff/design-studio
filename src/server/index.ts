import { createServer } from "./main/public.js";
import { DataDirLockedError, LOCKED_EXIT_CODE } from "./store/data-lock.js";
import {
  createThumbnailService,
  observeBus,
  wantsThumbnail,
} from "./thumbnails.js";

createServer({
  thumbnails: { createThumbnailService, observeBus, wantsThumbnail },
}).catch((error: unknown) => {
  if (error instanceof DataDirLockedError) {
    console.error(`[studio] ${error.message}`);
    process.exit(LOCKED_EXIT_CODE);
  }

  console.error("[studio] failed to start", error);
  process.exit(1);
});
