import type { AnyAction } from "@design-studio/actions/_core/action";
import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type { StudioError } from "@design-studio/actions/_core/errors/all";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect, Schema } from "effect";

import { EventQueue } from "../../events/index.js";
import {
  Authorizer,
  isFirstVersionWrite,
  LocalOrgScope,
  LocalPrincipal,
  ProjectAccess,
  toOrgScope,
} from "../../store/index.js";
import type { Principal } from "../../store/index.js";
import type { AnyAccess, Entry } from "./handler.js";

type WireArgs = Readonly<Record<string, Schema.Json>>;

type WireForm = "json" | "query";

interface Decoded {
  readonly projectId?: string;
}

type Gate = (card: ApprovalCard) => Effect.Effect<void, StudioError>;

type RunNeeds = AnyAccess | Authorizer | EventQueue | ProjectAccess;

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
) => Effect.Effect<ApprovalCard | null, StudioError, AnyAccess>;

const STRICT = { errors: "all", onExcessProperty: "error" } as const;

const MAIN_DIRECTION = "main";

const NULL_TEXT = "null";

const isMissingDirection = (value: Schema.Json | null): boolean =>
  value === null || value === NULL_TEXT;

const toDirectionArgs = (
  action: AnyAction,
  args: WireArgs
): (WireArgs & { readonly directionId: Schema.Json }) | WireArgs => {
  if (!action.http.path.includes(":directionId")) {
    return args;
  }

  if (isMissingDirection(args.directionId ?? null)) {
    return { ...args, directionId: MAIN_DIRECTION };
  }

  return args;
};

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

const isHeldWrite = (action: AnyAction, input: Decoded): boolean =>
  isFirstVersionWrite(action) && "directionId" in input;

const toReadyWait = (
  action: AnyAction,
  input: Decoded
): Effect.Effect<void, Conflict, ProjectAccess> =>
  Effect.gen(function* ready() {
    if (!isHeldWrite(action, input) || !input.projectId) {
      return;
    }

    const access = yield* ProjectAccess;

    yield* access.ready(input.projectId);
  });

const announceDone = (
  action: AnyAction,
  input: Decoded
): Effect.Effect<void, never, EventQueue> =>
  Effect.gen(function* announce() {
    if (action.access === "read") {
      return;
    }

    const bus = yield* EventQueue;

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
        decoders[form](toDirectionArgs(action, args)),
        (issue) => new BadRequest({ message: issue.message })
      );

      const authorizer = yield* Authorizer;

      yield* authorizer.require(action.needs);
      yield* checkScope(action, input);
      yield* toReadyWait(action, input);

      if (preview !== null) {
        const card = yield* preview(input);

        if (card !== null) {
          yield* callGate(card);
        }
      }

      const output = yield* handle(input);

      yield* announceDone(action, input);

      return output;
    });

    const scoped = program.pipe(
      Effect.tapDefect((defect) => Effect.logError(action.id, defect)),
      Effect.provideService(LocalPrincipal, principal),
      Effect.provideService(LocalOrgScope, toOrgScope(principal))
    );

    return provenByRuntimeCheck(scoped);
  };
};

const allowAll: Gate = () => Effect.void;

export { allowAll, makeRunner };

export type { Gate, RunNeeds, Runner, WireArgs, WireForm };
