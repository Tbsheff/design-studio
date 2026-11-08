// @generated

const ChartErrors = [] as const;

type ChartError = InstanceType<(typeof ChartErrors)[number]>;

type ChartErrorTag = ChartError["_tag"];

export { ChartErrors };

export type { ChartError, ChartErrorTag };
