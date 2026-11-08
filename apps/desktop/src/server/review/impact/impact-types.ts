import type {
  ImpactResultSchema,
  ImpactRouteSchema,
} from "@design-studio/actions/impact/schema";

type ImpactResult = typeof ImpactResultSchema.Type;

type ImpactRoute = typeof ImpactRouteSchema.Type;

interface ImpactGetQuery {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface ImpactRunQuery extends ImpactGetQuery {
  readonly file: string;
  readonly limit: number;
  readonly phase: "baseline" | "compare";
}

interface ImpactBaselineRoute {
  readonly file: string;
  readonly png: string | null;
  readonly route: string;
}

interface ImpactBaseline {
  readonly at: number;
  readonly component: string | null;
  readonly file: string;
  readonly routes: readonly ImpactBaselineRoute[];
}

interface ImpactRecord {
  readonly baseline: ImpactBaseline | null;
  readonly last: ImpactResult;
}

export type {
  ImpactBaseline,
  ImpactBaselineRoute,
  ImpactGetQuery,
  ImpactRecord,
  ImpactResult,
  ImpactRoute,
  ImpactRunQuery,
};
