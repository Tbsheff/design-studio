import { ApiError, call, createLiveStore, directEditRoutes } from "./deps.js";
import type {
  InsertComponentRequest,
  InsertJsxRequest,
  InsertPosition,
  InsertableComponent,
  RouteOutput,
} from "./deps.js";

interface DropHint {
  readonly ok: boolean;
  readonly text: string;
}

interface InsertHost {
  readonly dragEnd: (
    component: InsertableComponent,
    left: number,
    top: number
  ) => void;
  readonly dragMove: (
    left: number,
    top: number,
    onHint: (hint: DropHint | null) => void
  ) => void;
  readonly insert: (
    component: InsertableComponent,
    position: InsertPosition
  ) => void;
}

type InsertOutput = RouteOutput<
  typeof directEditRoutes.insertComponentDirectEdit
>;

type InsertJsxOutput = RouteOutput<typeof directEditRoutes.insertJsxDirectEdit>;

type ListOutput = RouteOutput<typeof directEditRoutes.listInsertableDirectEdit>;

const insertApi = {
  insert: (
    pid: string,
    did: string,
    request: InsertComponentRequest
  ): Promise<InsertOutput> =>
    call(directEditRoutes.insertComponentDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  insertJsx: (
    pid: string,
    did: string,
    request: InsertJsxRequest
  ): Promise<InsertJsxOutput> =>
    call(directEditRoutes.insertJsxDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  list: (pid: string, did: string): Promise<ListOutput> =>
    call(directEditRoutes.listInsertableDirectEdit, {
      directionId: did,
      projectId: pid,
    }),
};

const apiMessageOf = (error: ApiError): string => {
  const message = error.data?.message ?? null;

  if (message === String(message)) {
    return message;
  }

  return error.message;
};

const insertError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return apiMessageOf(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const hostStore = createLiveStore<InsertHost | null>(null);

const insertBus = {
  clear: (owner: InsertHost): void => {
    if (hostStore.get() === owner) {
      hostStore.set(null);
    }
  },
  get: (): InsertHost | null => hostStore.get(),
  set: (next: InsertHost | null): void => {
    hostStore.set(next);
  },
};

export { insertApi, insertBus, insertError };

export type { DropHint, InsertHost };
