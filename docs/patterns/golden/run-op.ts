import { Effect, Schema } from "effect";

import type { ApprovalCard } from "../../../shared/contract/_core/approval-card.js";
import type { StudioError } from "../../../shared/contract/_core/errors/all.js";
import { BadRequest } from "../../../shared/contract/_core/errors/bad-request.js";
import type { NotFound } from "../../../shared/contract/_core/errors/not-found.js";
import type { AnyOp } from "../../../shared/contract/_core/op.js";
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

type RunNeeds = AnyAccess | Authorizer | ProjectAccess;

type Proven = Effect.Effect<object, StudioError>;

type Runner = (args: WireArgs, principal: Principal, form: WireForm) => Proven;

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
  op: AnyOp,
  input: Decoded
): Effect.Effect<void, NotFound, ProjectAccess> =>
  Effect.gen(function* scope() {
    if (op.scope !== "project" || !input.projectId) {
      return;
    }

    const access = yield* ProjectAccess;

    yield* access.visible(input.projectId);
  });

const previewOf = <Op extends AnyOp>(entry: Entry<Op>): ErasedCard | null => {
  if ("preview" in entry) {
    return entry.preview as ErasedCard;
  }

  return null;
};

const makeRunner = <Op extends AnyOp>(
  op: Op,
  entry: Entry<Op>,
  gate: Gate
): Runner => {
  const decoders: Readonly<Record<WireForm, Decode>> = {
    json: Schema.decodeUnknownEffect(op.input, STRICT),
    query: Schema.decodeUnknownEffect(
      Schema.toCodecStringTree(op.input),
      STRICT
    ),
  };

  const handle = entry.handle as Erased;
  const preview = previewOf(entry);

  return (args, principal, form) => {
    const program = Effect.gen(function* runOp() {
      const input = yield* Effect.mapError(
        decoders[form](args),
        (issue) => new BadRequest({ message: issue.message })
      );

      const authorizer = yield* Authorizer;

      yield* authorizer.require(op.needs);
      yield* checkScope(op, input);

      if (preview !== null) {
        yield* gate(yield* preview(input));
      }

      return yield* handle(input);
    });

    const scoped = program.pipe(
      Effect.tapDefect((defect) => Effect.logError(op.id, defect)),
      Effect.provideService(LocalPrincipal, principal),
      Effect.provideService(LocalOrgScope, scopeOf(principal))
    );

    return provenByRuntimeCheck(scoped);
  };
};

const allowAll: Gate = () => Effect.void;

export { allowAll, makeRunner };

export type { Gate, RunNeeds, Runner, WireArgs, WireForm };
