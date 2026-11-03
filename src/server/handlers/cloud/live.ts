import { Layer } from "effect";

import { CloudClient } from "../../cloud/client.js";
import { CloudSession } from "../../cloud/session.js";

const CloudLive = Layer.mergeAll(CloudSession.layer, CloudClient.layer);

export { CloudLive };
