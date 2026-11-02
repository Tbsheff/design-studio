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

type DoctorViewText = typeof DoctorViewSchema.Type;

type PortPlanView = typeof PortPlanViewSchema.Type;

export {
  ComponentUsageSchema,
  DoctorViewSchema,
  PathTextSchema,
  PortPlanViewSchema,
  RouteTextSchema,
};

export type { DoctorView, DoctorViewText, PortPlanView };
