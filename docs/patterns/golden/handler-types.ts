import type { Effect } from "effect";

import type {
  AnyAction,
  ErrorOf,
  Input,
  Output,
} from "../../../shared/actions/_core/action.js";
import type { ApprovalCard } from "../../../shared/actions/_core/approval-card.js";

interface ReadAccess {
  readonly access: "read";
}

interface AnyAccess {
  readonly access: "read" | "write";
}

type EnvOf<Action extends AnyAction> = Action["access"] extends "read"
  ? ReadAccess
  : AnyAccess;

type Handle<Action extends AnyAction> = (
  input: Input<Action>
) => Effect.Effect<Output<Action>, ErrorOf<Action>, EnvOf<Action>>;

type Preview<Action extends AnyAction> = (
  input: Input<Action>
) => Effect.Effect<ApprovalCard, ErrorOf<Action>, ReadAccess>;

interface PlainEntry<Action extends AnyAction> {
  readonly handle: Handle<Action>;
}

interface ConfirmEntry<Action extends AnyAction> extends PlainEntry<Action> {
  readonly preview: Preview<Action>;
}

type Entry<Action extends AnyAction> = Action extends {
  readonly confirm: "user";
}
  ? ConfirmEntry<Action>
  : PlainEntry<Action>;

type Entries<Actions extends Readonly<Record<string, AnyAction>>> = {
  readonly [Key in keyof Actions]: Entry<Actions[Key]>;
};

export type { AnyAccess, Entries, Entry, EnvOf, Handle, Preview, ReadAccess };
