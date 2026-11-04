// @generated
import { createAnimation } from "./create.js";
import { deleteAnimation } from "./delete.js";
import { exportAnimation } from "./export.js";
import { getAnimation } from "./get.js";
import { listAnimation } from "./list.js";
import { updateAnimation } from "./update.js";

const AnimationActions = {
  createAnimation,
  deleteAnimation,
  exportAnimation,
  getAnimation,
  listAnimation,
  updateAnimation,
} as const;

export { AnimationActions };
