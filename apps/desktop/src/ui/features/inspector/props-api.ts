import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SourceLoc, Version } from "@design-studio/contracts";
import type {
  ComponentVariantChange,
  ComponentVariantTarget,
} from "@design-studio/contracts/component-variant";
import type {
  ComponentInstance,
  InstanceQuery,
  PropValue,
  SetPropsResult,
  VariantClassRequest,
} from "@design-studio/contracts/props";

import {
  getVariantPreviewAt,
  writeVariantAt,
} from "../../platform/component-variant-api.js";
import { call } from "../../platform/http.js";

interface VariantPreviewQuery {
  readonly file: string;
  readonly name: string;
  readonly key: string;
  readonly value: string;
  readonly className: string | null;
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

const propsApi = {
  components: (
    pid: string,
    did: string
  ): ReturnType<typeof call<typeof routes.listPropsComponentsDirectEdit>> =>
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
  variantClasses: (
    pid: string,
    did: string,
    request: VariantClassRequest
  ): ReturnType<typeof call<typeof routes.setVariantClassesDirectEdit>> =>
    call(routes.setVariantClassesDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  variantPreview: (
    pid: string,
    did: string,
    query: VariantPreviewQuery
  ): ReturnType<typeof getVariantPreviewAt> =>
    getVariantPreviewAt(pid, did, query),
  writeVariant: (
    pid: string,
    did: string,
    target: ComponentVariantTarget,
    change: ComponentVariantChange
  ): ReturnType<typeof writeVariantAt> =>
    writeVariantAt(pid, did, target, change),
};

export { propsApi };

export type { VariantPreviewQuery };
