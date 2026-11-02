import { Layer } from "effect";

const liveLayer = Layer.empty;

type LiveServices = Layer.Success<typeof liveLayer>;

export { liveLayer };

export type { LiveServices };
