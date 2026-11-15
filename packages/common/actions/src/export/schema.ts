import {
  EXPORT_FRAME_MAX_HEIGHT,
  EXPORT_FRAME_MAX_SIDE,
} from "@design-studio/contracts/export";
import { Schema } from "effect";

const SELECTOR_MAX = 2000;
const PAGE_PATH_MAX = 300;

const CopyCodeFormatSchema = Schema.Literals(["html", "tailwind", "react"]);

const CopySelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SELECTOR_MAX)
);

const PagePathSchema = Schema.String.check(Schema.isMaxLength(PAGE_PATH_MAX));

const FrameSideSchema = Schema.Int.check(
  Schema.isBetween({ maximum: EXPORT_FRAME_MAX_SIDE, minimum: 1 })
);

const FrameHeightSchema = Schema.Int.check(
  Schema.isBetween({ maximum: EXPORT_FRAME_MAX_HEIGHT, minimum: 1 })
);

const CopyCodeResultSchema = Schema.Struct({
  code: Schema.String,
  format: CopyCodeFormatSchema,
});

const FRAME_NAME_MAX = 60;
const FRAME_PATH_MAX = 200;
const FRAME_REF_MAX = 60;
const MAX_FRAMES = 12;
const FOLDER_MAX = 4096;

const FrameNameSchema = Schema.String.check(Schema.isMaxLength(FRAME_NAME_MAX));

const FramePathSchema = Schema.String.check(Schema.isMaxLength(FRAME_PATH_MAX));

const ExportFrameSchema = Schema.Struct({
  height: FrameHeightSchema,
  name: FrameNameSchema,
  path: Schema.optionalKey(FramePathSchema),
  width: FrameSideSchema,
});

const ExportFrameInputSchema = Schema.Struct({
  height: FrameHeightSchema,
  name: Schema.optionalKey(FrameNameSchema),
  path: Schema.optionalKey(FramePathSchema),
  width: FrameSideSchema,
});

const FrameRefSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_REF_MAX)
);

const ExportFramesSchema = Schema.Array(ExportFrameSchema).check(
  Schema.isMaxLength(MAX_FRAMES)
);

const ExportFrameInputsSchema = Schema.Array(ExportFrameInputSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_FRAMES)
);

const FrameRefsSchema = Schema.Array(FrameRefSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_FRAMES)
);

const SCALE_MAX = 3;

const ExportScaleSchema = Schema.Literals([1, 2, SCALE_MAX]);

const ExportScopeSchema = Schema.Literals(["frame", "page"]);

const FolderPathSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FOLDER_MAX)
);

const ExportFileResultSchema = Schema.Struct({
  content: Schema.String,
  name: Schema.String,
  note: Schema.NullOr(Schema.String),
  type: Schema.String,
});

const HandoffFolderResultSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  path: Schema.String,
  prompt: Schema.String,
  versionId: Schema.String,
});

const FolderExportResultSchema = Schema.Struct({
  bytes: Schema.optionalKey(Schema.Int),
  files: Schema.Array(Schema.String),
  handoffFiles: Schema.optionalKey(Schema.Int),
  note: Schema.optionalKey(Schema.String),
  prompt: Schema.optionalKey(Schema.String),
  versionId: Schema.String,
});

const FrameExportResultSchema = Schema.Struct({
  bytes: Schema.Int,
  file: Schema.String,
  format: Schema.Literals(["svg", "pptx"]),
  frames: Schema.Array(Schema.String),
  note: Schema.optionalKey(Schema.String),
  versionId: Schema.String,
});

type CopyCodeResult = typeof CopyCodeResultSchema.Type;

type ExportFileResult = typeof ExportFileResultSchema.Type;

type HandoffFolderResult = typeof HandoffFolderResultSchema.Type;

type FolderExportResult = typeof FolderExportResultSchema.Type;

type FrameExportResult = typeof FrameExportResultSchema.Type;

type ExportFileResultWire = typeof ExportFileResultSchema.Encoded;

export {
  CopyCodeFormatSchema,
  CopyCodeResultSchema,
  CopySelectorSchema,
  ExportFileResultSchema,
  ExportFrameInputsSchema,
  ExportFramesSchema,
  ExportScaleSchema,
  ExportScopeSchema,
  FolderExportResultSchema,
  FolderPathSchema,
  FrameExportResultSchema,
  FrameRefsSchema,
  FrameSideSchema,
  HandoffFolderResultSchema,
  PagePathSchema,
};

export type {
  CopyCodeResult,
  ExportFileResult,
  ExportFileResultWire,
  FolderExportResult,
  FrameExportResult,
  HandoffFolderResult,
};
