// @generated

const PortErrors = [] as const;

type PortError = InstanceType<(typeof PortErrors)[number]>;

type PortErrorTag = PortError["_tag"];

export { PortErrors };

export type { PortError, PortErrorTag };
