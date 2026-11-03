import { COLLECT_BODY } from "./collect-script.probe.js";

const collectScript = (
  selector: string | null,
  maxNodes: number,
  maxFaces: number
): string =>
  `(${COLLECT_BODY})(${JSON.stringify({ maxFaces, maxNodes, selector })})`;

export { collectScript };
