import type { Effect } from "effect";

import type { ApprovalCard } from "../../../shared/contract/_core/approval-card.js";
import type {
  AnyOp,
  ErrorOf,
  Input,
  Output,
} from "../../../shared/contract/_core/op.js";

interface ReadAccess {
  readonly access: "read";
}

interface AnyAccess {
  readonly access: "read" | "write";
}

type EnvOf<Op extends AnyOp> = Op["access"] extends "read"
  ? ReadAccess
  : AnyAccess;

type Handle<Op extends AnyOp> = (
  input: Input<Op>
) => Effect.Effect<Output<Op>, ErrorOf<Op>, EnvOf<Op>>;

type Preview<Op extends AnyOp> = (
  input: Input<Op>
) => Effect.Effect<ApprovalCard, ErrorOf<Op>, ReadAccess>;

interface PlainEntry<Op extends AnyOp> {
  readonly handle: Handle<Op>;
}

interface ConfirmEntry<Op extends AnyOp> extends PlainEntry<Op> {
  readonly preview: Preview<Op>;
}

type Entry<Op extends AnyOp> = Op extends { readonly confirm: "user" }
  ? ConfirmEntry<Op>
  : PlainEntry<Op>;

type Entries<Ops extends Readonly<Record<string, AnyOp>>> = {
  readonly [Key in keyof Ops]: Entry<Ops[Key]>;
};

export type { AnyAccess, Entries, Entry, EnvOf, Handle, Preview, ReadAccess };
