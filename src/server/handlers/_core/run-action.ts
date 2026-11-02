import { Effect, Schema } from "effect";

import type { AnyAction } from "../../../shared/actions/_core/action.js";
import type { ApprovalCard } from "../../../shared/actions/_core/approval-card.js";
import type { StudioError } from "../../../shared/actions/_core/errors/all.js";
import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import type { NotFound } from "../../../shared/actions/_core/errors/not-found.js";
import { EventBus } from "../../events/event-bus.js";
import { Authorizer } from "../../store/authorizer.js";
import { LocalOrgScope, scopeOf } from "../../store/local-org-scope.js";
import { LocalPrincipal } from "../../store/local-principal.js";
import type { Principal } from "../../store/local-principal.js";
import { ProjectAccess } from "../../store/project-access.js";
import type { AnyAccess, Entry } from "./handler.js";

type WireArgs = Readonly<Record<string, Schema.Json>>;

type WireForm = "json" | "query";

interface Decoded {
  readonly projectId?: string;
}

type Gate = (card: ApprovalCard) => Effect.Effect<void, StudioError>;

type RunNeeds = AnyAccess | Authorizer | EventBus | ProjectAccess;

type Proven = Effect.Effect<object, StudioError>;

type Runner = (
  args: WireArgs,
  principal: Principal,
  form: WireForm,
  callGate?: Gate
) => Proven;

type Decode = (args: WireArgs) => Effect.Effect<Decoded, Schema.SchemaError>;

type Erased = (input: Decoded) => Effect.Effect<object, StudioError, AnyAccess>;

type ErasedCard = (
  input: Decoded
) => Effect.Effect<ApprovalCard, StudioError, AnyAccess>;

const STRICT = { onExcessProperty: "error" } as const;

const provenByRuntimeCheck = (
  program: Effect.Effect<object, StudioError, RunNeeds>
): Proven => program as Proven;

const checkScope = (
  action: AnyAction,
  input: Decoded
): Effect.Effect<void, NotFound, ProjectAccess> =>
  Effect.gen(function* scope() {
    if (action.scope !== "project" || !input.projectId) {
      return;
    }

    const access = yield* ProjectAccess;

    yield* access.visible(input.projectId);
  });

const announceDone = (
  action: AnyAction,
  input: Decoded
): Effect.Effect<void, never, EventBus> =>
  Effect.gen(function* announce() {
    if (action.access === "read") {
      return;
    }

    const bus = yield* EventBus;

    yield* bus.announce({
      actionId: action.id,
      invalidates: [...action.invalidates],
      projectId: input.projectId ?? null,
    });
  });

const previewOf = <Action extends AnyAction>(
  entry: Entry<Action>
): ErasedCard | null => {
  if ("preview" in entry) {
    return entry.preview as ErasedCard;
  }

  return null;
};

const makeRunner = <Action extends AnyAction>(
  action: Action,
  entry: Entry<Action>,
  gate: Gate
): Runner => {
  const decoders: Readonly<Record<WireForm, Decode>> = {
    json: Schema.decodeUnknownEffect(action.input, STRICT),
    query: Schema.decodeUnknownEffect(
      Schema.toCodecStringTree(action.input),
      STRICT
    ),
  };

  const handle = entry.handle as Erased;
  const preview = previewOf(entry);

  return (args, principal, form, callGate = gate) => {
    const program = Effect.gen(function* runAction() {
      const input = yield* Effect.mapError(
        decoders[form](args),
        (issue) => new BadRequest({ message: issue.message })
      );

      const authorizer = yield* Authorizer;

      yield* authorizer.require(action.needs);
      yield* checkScope(action, input);

      if (preview !== null) {
        yield* callGate(yield* preview(input));
      }

      const output = yield* handle(input);

      yield* announceDone(action, input);

      return output;
    });

    const scoped = program.pipe(
      Effect.tapDefect((defect) => Effect.logError(action.id, defect)),
      Effect.provideService(LocalPrincipal, principal),
      Effect.provideService(LocalOrgScope, scopeOf(principal))
    );

    return provenByRuntimeCheck(scoped);
  };
};

const allowAll: Gate = () => Effect.void;

export { allowAll, makeRunner };

export type { Gate, RunNeeds, Runner, WireArgs, WireForm };
