import { Effect, Schema } from "effect";

type Item = Schema.Codec<unknown, unknown, never, never>;

type Page<Of extends Item> = Schema.Struct<{
  readonly items: Schema.$Array<Of>;
  readonly next: Schema.NullOr<Schema.String>;
}>;

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

const pageOf = <Of extends Item>(item: Of): Page<Of> =>
  Schema.Struct({
    items: Schema.Array(item),
    next: Schema.NullOr(Schema.String),
  });

export { PAGE_MAX, PageFields, pageOf };

export type { Page };
