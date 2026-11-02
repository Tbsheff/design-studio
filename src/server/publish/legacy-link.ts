import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { PublishPlan, PublishPlanInput } from "../../shared/publish.js";
import { loadConfig } from "../platform/config/index.js";
import { NotFoundError } from "../store/errors.js";
import type {
  PublishDeps,
  PublishService as LegacyPublishService,
} from "./service.js";

interface LegacyLink {
  readonly deps: PublishDeps;
  readonly plans: Map<string, PublishPlan>;
  readonly service: LegacyPublishService;
}

const NOT_READY =
  "Publish is not ready in this Design Studio process. Restart Design Studio.";

const links = new Map<string, LegacyLink>();

const linkLegacy = (
  deps: PublishDeps,
  service: LegacyPublishService
): LegacyLink => {
  const plans = new Map<string, PublishPlan>();
  const link: LegacyLink = { deps, plans, service };

  links.set(deps.dataDir, link);

  return link;
};

const toPublishError = (error: Cause.UnknownError): BadRequest | NotFound => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
};

const attemptLegacy = <Value>(
  task: (link: LegacyLink) => Promise<Value>
): Effect.Effect<Value, BadRequest | NotFound> =>
  Effect.gen(function* withLink() {
    const link = links.get(loadConfig().dataDir) ?? null;

    if (link === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(link)).pipe(
      Effect.mapError((failure) => toPublishError(failure))
    );
  });

const toPlanKey = (projectId: string, input: PublishPlanInput): string =>
  JSON.stringify([projectId, input]);

const planFor = async (
  link: LegacyLink,
  projectId: string,
  input: PublishPlanInput
): Promise<PublishPlan> => {
  const key = toPlanKey(projectId, input);
  const held = link.plans.get(key) ?? null;

  if (held !== null && held.planExpiresAt > Date.now()) {
    return held;
  }

  const made = await link.service.plan(projectId, input);

  link.plans.set(key, made);

  return made;
};

const takePlan = (
  link: LegacyLink,
  projectId: string,
  input: PublishPlanInput
): void => {
  link.plans.delete(toPlanKey(projectId, input));
};

export { attemptLegacy, linkLegacy, planFor, takePlan };

export type { LegacyLink };
