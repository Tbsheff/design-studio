import { routes } from "../shared/actions/direct-edit/routes.js";
import type {
  ComponentVariantChange,
  ComponentVariantResult,
  ComponentVariantTarget,
} from "../shared/component-variant";
import type { SourceLoc } from "../shared/contracts";
import type {
  InstanceQuery,
  PropValue,
  VariantClassRequest,
} from "../shared/props";
import { getBlob, json } from "./api";
import { call } from "./platform/http";

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
    call(routes.inspectPropsInstanceDirectEdit, {
      ...query,
      directionId: did,
      projectId: pid,
    }),
  setProps: (
    pid: string,
    did: string,
    source: SourceLoc,
    props: Record<string, PropValue | null>
  ) =>
    call(routes.setPropsDirectEdit, {
      directionId: did,
      projectId: pid,
      props,
      source,
    }),
  variantClasses: (pid: string, did: string, request: VariantClassRequest) =>
    call(routes.setVariantClassesDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
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
    call(routes.listPropsComponentsDirectEdit, {
      directionId: did,
      projectId: pid,
    }),
};

export type { VariantPreviewQuery };
