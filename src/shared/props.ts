import type { ClassChange, DirectStyleProperty, SourceLoc, Version } from './contracts.js';

export type PropValue = string | number | boolean;
export type PropControl = 'select' | 'boolean' | 'text' | 'number';

export interface PropSpec {
  name: string;
  control: PropControl;
  options?: string[];
  default?: PropValue;
  optional: boolean;
  from: 'variant' | 'type';
  node?: boolean;
}

export interface VariantOption {
  value: string;
  classes: string;
  line: number;
  editable: boolean;
}

export interface VariantGroup {
  prop: string;
  options: VariantOption[];
  default: string | null;
}

export interface CvaInfo {
  name: string;
  line: number;
  base: string;
  variants: VariantGroup[];
}

export interface ComponentSchema {
  name: string;
  file: string;
  line: number;
  props: PropSpec[];
  cva: CvaInfo | null;
  asChild: boolean;
  note: string | null;
}

export interface ComponentInstance {
  use: SourceLoc;
  tag: string;
  component: ComponentSchema | null;
  values: Record<string, PropValue>;
  dynamic: string[];
  spread: boolean;
  uses: number;
}

export interface ComponentOwner {
  name: string;
  stack: string;
}

export interface InstanceQuery {
  owners?: ComponentOwner[];
  usedAt?: SourceLoc | null;
  use?: SourceLoc | null;
}

export interface SetPropsRequest {
  source: SourceLoc;
  props: Record<string, PropValue | null>;
}

export interface SetPropsResult {
  file: string;
  version: Version | null;
  changed: string[];
  removed: string[];
  instance: ComponentInstance | null;
}

export interface VariantClassRequest {
  file: string;
  cva: string;
  prop: string;
  value: string;
  style?: Partial<Record<DirectStyleProperty, string | null>>;
  classes?: ClassChange;
}

export interface VariantClassResult {
  file: string;
  version: Version | null;
  classes: string[];
  note: string | null;
}

export type ComponentSource = 'package' | 'app';
export const COMPONENT_SOURCES = ['package', 'app', 'all'] as const;
export const COMPONENT_LIST_MAX = 100;

export interface ComponentListItem extends ComponentSchema {
  uses: number;
  source: ComponentSource;
  folder: string;
  parts: string[];
  import: string;
  example: string;
}

export interface ComponentListQuery {
  query?: string;
  source?: (typeof COMPONENT_SOURCES)[number];
  limit?: number;
  cursor?: string;
}

export interface ComponentSchemaList {
  components: ComponentListItem[];
  total: number;
  truncated: boolean;
  nextCursor: string | null;
}

export const PROP_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;
export const PROP_TEXT_MAX = 500;
export const PROPS_MAX = 20;
export const OWNERS_MAX = 6;
export const OWNER_STACK_MAX = 3000;
