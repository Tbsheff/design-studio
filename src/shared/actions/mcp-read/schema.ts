import { Schema } from "effect";

import type { AppDoctorResult } from "../../app-doctor.js";
import type { AppServerStatus } from "../../contracts.js";

interface DoctorView {
  readonly doctor: AppDoctorResult;
  readonly status: AppServerStatus;
}

const PATH_MAX = 500;

const ROUTE_MAX = 200;

const PathTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PATH_MAX)
);

const RouteTextSchema = Schema.String.check(Schema.isMaxLength(ROUTE_MAX));

const DoctorViewSchema = Schema.Struct({
  doctor: Schema.Unknown,
  status: Schema.Unknown,
  text: Schema.String,
});

const PortPlanViewSchema = Schema.Struct({
  actions: Schema.optionalKey(Schema.Unknown),
  base: Schema.optionalKey(Schema.Unknown),
  currentStep: Schema.optionalKey(Schema.Unknown),
  headings: Schema.optionalKey(Schema.Unknown),
  images: Schema.optionalKey(Schema.Unknown),
  inlineStyles: Schema.optionalKey(Schema.Unknown),
  kit: Schema.optionalKey(Schema.Unknown),
  links: Schema.optionalKey(Schema.Unknown),
  missing: Schema.optionalKey(Schema.Unknown),
  pages: Schema.optionalKey(Schema.Unknown),
  rawColors: Schema.optionalKey(Schema.Unknown),
  repeats: Schema.optionalKey(Schema.Unknown),
  sections: Schema.optionalKey(Schema.Unknown),
  skipped: Schema.optionalKey(Schema.Unknown),
  source: Schema.Unknown,
  steps: Schema.optionalKey(Schema.Unknown),
  target: Schema.Unknown,
  tokens: Schema.optionalKey(Schema.Unknown),
  unreached: Schema.optionalKey(Schema.Unknown),
  unselected: Schema.optionalKey(Schema.Unknown),
});

const ComponentUsageSchema = Schema.Struct({
  callSite: Schema.optionalKey(Schema.Unknown),
  component: Schema.NullOr(Schema.String),
  file: Schema.String,
  routes: Schema.Array(Schema.Unknown),
});

const ProjectSummaryListSchema = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
});

const ProjectSearchViewSchema = Schema.Struct({
  projects: Schema.Array(Schema.Unknown),
  query: Schema.String,
  routes: Schema.Array(Schema.Unknown),
});

const FoundAppsViewSchema = Schema.Struct({
  apps: Schema.Array(Schema.Unknown),
  home: Schema.String,
  roots: Schema.Array(Schema.String),
  scannedAt: Schema.Number,
  truncated: Schema.Boolean,
});

const VersionListSchema = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
});

const FileListSchema = Schema.Struct({
  files: Schema.Array(
    Schema.Struct({ bytes: Schema.Number, path: Schema.String })
  ),
  versionId: Schema.String,
});

const FileTextSchema = Schema.Struct({
  path: Schema.String,
  text: Schema.String,
});

const VariantListSchema = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
});

const RouteListSchema = Schema.Struct({
  appDir: Schema.String,
  framework: Schema.String,
  nextCursor: Schema.NullOr(Schema.String),
  routes: Schema.Array(Schema.Unknown),
  total: Schema.Number,
});

const FrameHtmlSchema = Schema.Struct({
  html: Schema.String,
});

const DesignMdSchema = Schema.Struct({
  text: Schema.String,
});

const TokensViewSchema = Schema.Struct({
  errors: Schema.optionalKey(Schema.Unknown),
  pack: Schema.optionalKey(Schema.Unknown),
  source: Schema.optionalKey(Schema.Unknown),
  text: Schema.optionalKey(Schema.String),
  tokens: Schema.Array(Schema.Unknown),
  tokensCss: Schema.optionalKey(Schema.String),
});

const ScreenshotSchema = Schema.Struct({
  data: Schema.String,
  mimeType: Schema.String,
  text: Schema.String,
});

type DoctorViewText = typeof DoctorViewSchema.Type;

type PortPlanView = typeof PortPlanViewSchema.Type;

export {
  ComponentUsageSchema,
  DesignMdSchema,
  DoctorViewSchema,
  FileListSchema,
  FileTextSchema,
  FoundAppsViewSchema,
  FrameHtmlSchema,
  PathTextSchema,
  PortPlanViewSchema,
  ProjectSearchViewSchema,
  ProjectSummaryListSchema,
  RouteListSchema,
  RouteTextSchema,
  ScreenshotSchema,
  TokensViewSchema,
  VariantListSchema,
  VersionListSchema,
};

export type { DoctorView, DoctorViewText, PortPlanView };
