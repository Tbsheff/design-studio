import { z } from "zod";

import { directionId, id, projectId } from "../edit-kit.js";

const restoreVersionSchema = z.strictObject({
  projectId,
  directionId,
  versionId: id("Version id from list_versions."),
});

type RestoreVersionInput = z.output<typeof restoreVersionSchema>;

export { restoreVersionSchema };

export type { RestoreVersionInput };
