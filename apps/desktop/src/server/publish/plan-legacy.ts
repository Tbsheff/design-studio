import type { PublishInput } from "../../shared/actions/publish/schema.js";
import type { PublishPlan } from "../../shared/publish.js";
import { planFor } from "./legacy-link.js";
import type { LegacyLink } from "./legacy-link.js";
import { toPlanInput } from "./plan-input.js";

const planLegacy = async (
  link: LegacyLink,
  input: PublishInput
): Promise<PublishPlan> =>
  planFor(link, input.projectId, await toPlanInput(link, input));

export { planLegacy };
