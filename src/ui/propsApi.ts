import type { ComponentInstance, ComponentSchemaList, InstanceQuery, PropValue, SetPropsResult, VariantClassRequest, VariantClassResult } from '../shared/props';
import type { SourceLoc } from '../shared/contracts';
import { json } from './api';

const d = (pid: string, did: string) => `/api/projects/${encodeURIComponent(pid)}/d/${encodeURIComponent(did)}`;

export const propsApi = {
  instance: (pid: string, did: string, query: InstanceQuery) => json<{ instance: ComponentInstance | null }>('POST', `${d(pid, did)}/props/instance`, query),
  setProps: (pid: string, did: string, source: SourceLoc, props: Record<string, PropValue | null>) => json<SetPropsResult>('POST', `${d(pid, did)}/props`, { source, props }),
  variantClasses: (pid: string, did: string, request: VariantClassRequest) => json<VariantClassResult>('POST', `${d(pid, did)}/props/variant-classes`, request),
  components: (pid: string, did: string) => json<ComponentSchemaList>('GET', `${d(pid, did)}/props/components`),
};
