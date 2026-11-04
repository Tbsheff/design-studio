import { z } from "../../platform/zod-bridge/index.js";
import { directionId, packId, projectId } from "../edit-kit.js";

const applyDesignSystemSchema = z.strictObject({
  projectId,
  directionId,
  packId: packId.describe("Design system (pack) id."),
});

type ApplyDesignSystemInput = z.output<typeof applyDesignSystemSchema>;

export { applyDesignSystemSchema };

export type { ApplyDesignSystemInput };
