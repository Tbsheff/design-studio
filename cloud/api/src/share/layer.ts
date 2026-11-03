import { Layer } from "effect";

import { TenantDb } from "../tenant/db.js";
import { ShareRepo } from "../tenant/repos/share.js";

const shareLayer = ShareRepo.layer.pipe(Layer.provide(TenantDb.layer));

export { shareLayer };
