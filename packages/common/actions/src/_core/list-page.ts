import { Effect, Schema } from "effect";

type Item = Schema.Codec<unknown, unknown, never, never>;

type PageExtra = Schema.Struct.Fields;

type NoExtra = Record<never, never>;

const NO_EXTRA: NoExtra = {};

type Page<Of extends Item, Extra extends PageExtra = NoExtra> = Schema.Struct<
  {
    readonly items: Schema.$Array<Of>;
    readonly next: Schema.NullOr<Schema.String>;
  } & Extra
>;

const PAGE_DEFAULT = 50;

const PAGE_MAX = 200;

const LimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: PAGE_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(PAGE_DEFAULT)));

const PageFields = {
  cursor: Schema.NullOr(Schema.String).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null))
  ),
  limit: LimitSchema,
};

const pageOf = <Of extends Item, Extra extends PageExtra = NoExtra>(
  item: Of,
  extra: Extra = NO_EXTRA as Extra
): Page<Of, Extra> =>
  Schema.Struct({
    items: Schema.Array(item),
    next: Schema.NullOr(Schema.String),
    ...extra,
  });

export { PAGE_MAX, PageFields, pageOf };

export type { Page };
