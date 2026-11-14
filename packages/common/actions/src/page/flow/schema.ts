import { Effect, Schema } from "effect";

const PAGE_FLOW_MAX = 12;

const PAGE_FLOW_GAP_MAX = 60;

const PAGE_FLOW_ENTRY_MAX = 300;

const PageFlowEntrySchema = Schema.NullOr(
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PAGE_FLOW_ENTRY_MAX)
  ).annotate({
    description:
      'Path of the first HTML page of the flow, for example "index.html". Leave out for the start page.',
  })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const PageFlowGapKindSchema = Schema.Literals([
  "part-missing",
  "part-changed",
  "token-changed",
  "sheet-missing",
]);

const PageFlowGapSchema = Schema.Struct({
  detail: Schema.String,
  kind: PageFlowGapKindSchema,
  page: Schema.String,
  part: Schema.String,
  selector: Schema.NullOr(Schema.String),
});

const PageFlowSchema = Schema.Struct({
  gaps: Schema.Array(PageFlowGapSchema).check(
    Schema.isMaxLength(PAGE_FLOW_GAP_MAX)
  ),
  pages: Schema.Array(Schema.String).check(Schema.isMaxLength(PAGE_FLOW_MAX)),
});

type PageFlow = typeof PageFlowSchema.Type;

type PageFlowGap = typeof PageFlowGapSchema.Type;

type PageFlowGapKind = typeof PageFlowGapKindSchema.Type;

export {
  PAGE_FLOW_GAP_MAX,
  PAGE_FLOW_MAX,
  PageFlowEntrySchema,
  PageFlowGapKindSchema,
  PageFlowGapSchema,
  PageFlowSchema,
};

export type { PageFlow, PageFlowGap, PageFlowGapKind };
