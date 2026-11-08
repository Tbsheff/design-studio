import { toRandom } from "./to-random.js";
import { toSampleCell } from "./to-sample-value.js";
import type {
  EngineResult,
  PrismaModel,
  SampleCell,
  SampleRequest,
  SampleRow,
} from "./types.js";

const toForeignModels = (model: PrismaModel): ReadonlyMap<string, string> =>
  new Map(
    model.fields.flatMap((field) =>
      (field.relation?.fields ?? []).map((name): [string, string] => [
        name,
        field.relation?.model ?? "",
      ])
    )
  );

const toRow = (
  model: PrismaModel,
  request: SampleRequest,
  index: number
): SampleRow => {
  const random = toRandom(request.seed, `${model.name}:${String(index)}`);
  const foreign = toForeignModels(model);

  const { variant } = request;

  const cells = model.fields.flatMap((field): [string, SampleCell][] => {
    if (field.relation !== null) {
      return [];
    }

    const foreignModel = foreign.get(field.name) ?? null;

    return [
      [
        field.name,
        toSampleCell({ field, foreignModel, index, random, variant }),
      ],
    ];
  });

  return Object.fromEntries(cells);
};

const toSampleRows = (request: SampleRequest): EngineResult<SampleRow[]> => {
  const model =
    request.models.find((found) => found.name === request.name) ?? null;

  if (model === null) {
    return { code: "unknown-model", ok: false };
  }

  if (model.kind === "enum") {
    return { code: "enum-model", ok: false };
  }

  const value = Array.from({ length: request.rows }, (_unused, index) =>
    toRow(model, request, index)
  );

  return { ok: true, value };
};

export { toSampleRows };
