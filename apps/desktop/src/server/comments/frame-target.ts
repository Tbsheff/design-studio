import type { DesignComment } from "../../shared/contracts.js";

const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 900;

const frameTarget = (): DesignComment["target"] => ({
  rectHint: { height: FRAME_HEIGHT, width: FRAME_WIDTH, x: 0, y: 0 },
  selector: "body",
  sourceLoc: null,
  tag: "body",
  textSnippet: "",
});

export { frameTarget };
