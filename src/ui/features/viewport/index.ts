import { lazy } from "react";

const MatrixSlot = lazy(async () => {
  const loaded = await import("./matrix-slot.js");

  return { default: loaded.MatrixSlot };
});

export { MatrixSlot };
