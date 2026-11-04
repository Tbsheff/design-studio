import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SourceLoc, Version } from "@design-studio/contracts";
import type {
  ComponentInstance,
  InstanceQuery,
  PropValue,
  SetPropsResult,
  VariantClassRequest,
} from "@design-studio/contracts/props";

import type {
  ComponentVariantChange,
  ComponentVariantResult,
  ComponentVariantTarget,
} from "../../../shared/component-variant.js";
import { getBlob, json } from "../../api.js";
import { call } from "../../platform/http.js";

interface VariantPreviewQuery {
  file: string;
  name: string;
  key: string;
  value: string;
  className: string | null;
}

const COMPONENT_PAGE_LIMIT = 100;

const isInstance = <Value>(value: Value): value is Value & ComponentInstance =>
  value instanceof Object && "use" in value && "values" in value;

const toInstance = <Value>(value: Value): ComponentInstance | null => {
  if (isInstance(value)) {
    return value;
  }

  return null;
};

const isVersion = <Value>(value: Value): value is Value & Version =>
  value instanceof Object && "id" in value && "title" in value;

const toVersion = <Value>(value: Value): Version | null => {
  if (isVersion(value)) {
    return value;
  }

  return null;
};

const d = (pid: string, did: string) =>
  `/api/projects/${encodeURIComponent(pid)}/d/${encodeURIComponent(did)}`;

export const propsApi = {
  components: (pid: string, did: string) =>
    call(routes.listPropsComponentsDirectEdit, {
      cursor: null,
      directionId: did,
      limit: COMPONENT_PAGE_LIMIT,
      projectId: pid,
    }),
  instance: async (
    pid: string,
    did: string,
    query: InstanceQuery
  ): Promise<{ readonly instance: ComponentInstance | null }> => {
    const result = await call(routes.inspectPropsInstanceDirectEdit, {
      directionId: did,
      owners: JSON.stringify(query.owners ?? []),
      projectId: pid,
      use: JSON.stringify(query.use ?? null),
      usedAt: JSON.stringify(query.usedAt ?? null),
    });

    return { instance: toInstance(result.instance) };
  },
  setProps: async (
    pid: string,
    did: string,
    source: SourceLoc,
    props: Record<string, PropValue | null>
  ): Promise<SetPropsResult> => {
    const result = await call(routes.setPropsDirectEdit, {
      directionId: did,
      projectId: pid,
      props,
      source,
    });

    return {
      changed: [...result.changed],
      file: result.file,
      instance: toInstance(result.instance),
      removed: [...result.removed],
      version: toVersion(result.version),
    };
  },
  variantClasses: (pid: string, did: string, request: VariantClassRequest) =>
    call(routes.setVariantClassesDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  variantPreview: (pid: string, did: string, query: VariantPreviewQuery) =>
    getBlob(
      `${d(pid, did)}/component-variant/preview?${new URLSearchParams(
        Object.entries(query).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      ).toString()}`
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
      { change, target }
    ),
};

export type { VariantPreviewQuery };
