import { Schema } from "effect";
import type { Result, SchemaAST } from "effect";

type DecodableSchema = Schema.Top & { readonly DecodingServices: never };

type ExcessProperty = "error" | "ignore";

const toDecoder = <Item extends DecodableSchema>(
  schema: Item,
  excess: ExcessProperty
): (<Input>(input: Input) => Result.Result<Item["Type"], Schema.SchemaError>) =>
  Schema.decodeUnknownResult(schema, {
    errors: "all",
    onExcessProperty: excess,
  } satisfies SchemaAST.ParseOptions);

export { toDecoder };

export type { DecodableSchema, ExcessProperty };
