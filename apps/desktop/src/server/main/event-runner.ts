import { Effect } from "effect";

import type { EventRunner } from "../events/index.js";

const eventRunner: EventRunner = {
  toPromise: (program) => Effect.runPromise(program),
};

export { eventRunner };
