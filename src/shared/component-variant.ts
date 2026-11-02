const VARIANT_KEY = /^[A-Za-z][A-Za-z0-9]{0,39}$/u;

const VARIANT_VALUE = /^[A-Za-z0-9][\w-]{0,39}$/u;

const VARIANT_CLASSES = /^[^"'`\\\n\r]{0,2000}$/u;

const RESERVED_KEYS: ReadonlySet<string> = new Set(["class", "className"]);

interface ComponentVariantTarget {
  readonly cva: string | null;
  readonly file: string | null;
  readonly name: string | null;
}

interface ComponentVariantCreate {
  readonly classes: string | null;
  readonly copyFrom: string | null;
  readonly key: string;
  readonly kind: "create";
  readonly newKey: boolean;
  readonly setDefault: boolean;
  readonly value: string;
}

interface ComponentVariantUpdate {
  readonly classes: string | null;
  readonly key: string;
  readonly kind: "update";
  readonly rename: string | null;
  readonly setDefault: boolean;
  readonly value: string;
}

type ComponentVariantChange = ComponentVariantCreate | ComponentVariantUpdate;

interface ComponentVariantRequest {
  readonly change: ComponentVariantChange;
  readonly target: ComponentVariantTarget;
}

interface ComponentVariantValue {
  readonly classes: string;
  readonly value: string;
}

interface ComponentVariantResult {
  readonly component: { readonly file: string; readonly name: string | null };
  readonly cva: string;
  readonly default: string | null;
  readonly files: readonly string[];
  readonly key: string;
  readonly note: string | null;
  readonly title: string;
  readonly value: string;
  readonly values: readonly ComponentVariantValue[];
  readonly versionId: string | null;
}

export { RESERVED_KEYS, VARIANT_CLASSES, VARIANT_KEY, VARIANT_VALUE };

export type {
  ComponentVariantChange,
  ComponentVariantCreate,
  ComponentVariantRequest,
  ComponentVariantResult,
  ComponentVariantTarget,
  ComponentVariantUpdate,
  ComponentVariantValue,
};
