import type {
  ComponentVariantChange,
  ComponentVariantResult,
  ComponentVariantTarget,
} from "../shared/component-variant";
import type { SourceLoc } from "../shared/contracts";
import type {
  ComponentInstance,
  ComponentSchemaList,
  InstanceQuery,
  PropValue,
  SetPropsResult,
  VariantClassRequest,
  VariantClassResult,
} from "../shared/props";
import { getBlob, json } from "./api";

interface VariantPreviewQuery {
  file: string;
  name: string;
  key: string;
  value: string;
  className: string | null;
}

const d = (pid: string, did: string) =>
  `/api/projects/${encodeURIComponent(pid)}/d/${encodeURIComponent(did)}`;

export const propsApi = {
  instance: (pid: string, did: string, query: InstanceQuery) =>
    json<{ instance: ComponentInstance | null }>(
      "POST",
      `${d(pid, did)}/props/instance`,
      query
    ),
  setProps: (
    pid: string,
    did: string,
    source: SourceLoc,
    props: Record<string, PropValue | null>
  ) => json<SetPropsResult>("POST", `${d(pid, did)}/props`, { source, props }),
  variantClasses: (pid: string, did: string, request: VariantClassRequest) =>
    json<VariantClassResult>(
      "POST",
      `${d(pid, did)}/props/variant-classes`,
      request
    ),
  writeVariant: (
    pid: string,
    did: string,
    target: ComponentVariantTarget,
    change: ComponentVariantChange
  ) =>
    json<ComponentVariantResult & { png: string | null }>(
      "POST",
      `${d(pid, did)}/component-variant`,
      { target, change }
    ),
  variantPreview: (pid: string, did: string, query: VariantPreviewQuery) =>
    getBlob(
      `${d(pid, did)}/component-variant/preview?${new URLSearchParams(
        Object.entries(query).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      ).toString()}`
    ),
  components: (pid: string, did: string) =>
    json<ComponentSchemaList>("GET", `${d(pid, did)}/props/components`),
};

export type { VariantPreviewQuery };
