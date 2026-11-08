interface PrismaRelation {
  readonly fields: readonly string[];
  readonly model: string;
}

interface PrismaField {
  readonly defaultText: string | null;
  readonly enumValues: readonly string[];
  readonly isId: boolean;
  readonly isList: boolean;
  readonly isOptional: boolean;
  readonly isUnique: boolean;
  readonly name: string;
  readonly relation: PrismaRelation | null;
  readonly type: string;
}

type PrismaKind = "enum" | "model";

interface PrismaModel {
  readonly fields: readonly PrismaField[];
  readonly file: string;
  readonly kind: PrismaKind;
  readonly line: number;
  readonly name: string;
  readonly values: readonly string[];
}

interface SchemaSource {
  readonly file: string;
  readonly text: string;
}

type SampleCell = readonly string[] | boolean | number | string | null;

type SampleRow = Readonly<Record<string, SampleCell>>;

type SampleVariant = "filled" | "long" | "sparse";

interface SampleRequest {
  readonly models: readonly PrismaModel[];
  readonly name: string;
  readonly rows: number;
  readonly seed: number;
  readonly variant: SampleVariant;
}

type EngineCode = "empty-schema" | "enum-model" | "unknown-model";

type EngineResult<Value> =
  | { readonly code: EngineCode; readonly ok: false }
  | { readonly ok: true; readonly value: Value };

export type {
  EngineCode,
  EngineResult,
  PrismaField,
  PrismaKind,
  PrismaModel,
  PrismaRelation,
  SampleCell,
  SampleRequest,
  SampleRow,
  SampleVariant,
  SchemaSource,
};
