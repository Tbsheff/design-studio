// @generated

const IntegrationErrors = [] as const;

type IntegrationError = InstanceType<(typeof IntegrationErrors)[number]>;

type IntegrationErrorTag = IntegrationError["_tag"];

export { IntegrationErrors };

export type { IntegrationError, IntegrationErrorTag };
