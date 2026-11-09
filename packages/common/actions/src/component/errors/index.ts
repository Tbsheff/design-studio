// @generated

const ComponentErrors = [] as const;

type ComponentError = InstanceType<(typeof ComponentErrors)[number]>;

type ComponentErrorTag = ComponentError["_tag"];

export { ComponentErrors };

export type { ComponentError, ComponentErrorTag };
