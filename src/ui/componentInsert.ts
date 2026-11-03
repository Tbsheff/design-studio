import { routes } from "../shared/actions/direct-edit/routes.js";
import type {
  InsertComponentRequest,
  InsertJsxRequest,
  InsertPosition,
  InsertableComponent,
} from "../shared/insert";
import { ApiError } from "./api";
import { call } from "./platform/http";

export const insertApi = {
  list: (pid: string, did: string) =>
    call(routes.listInsertableDirectEdit, {
      directionId: did,
      projectId: pid,
    }),
  insert: (pid: string, did: string, request: InsertComponentRequest) =>
    call(routes.insertComponentDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  insertJsx: (pid: string, did: string, request: InsertJsxRequest) =>
    call(routes.insertJsxDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
};

export function insertError(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof (error.data as { message?: unknown }).message === "string"
  ) {
    return (error.data as { message: string }).message;
  }

  return error instanceof Error ? error.message : String(error);
}

export interface DropHint {
  text: string;
  ok: boolean;
}

export interface InsertHost {
  insert(component: InsertableComponent, position: InsertPosition): void;
  dragMove(x: number, y: number, onHint: (hint: DropHint | null) => void): void;
  dragEnd(component: InsertableComponent, x: number, y: number): void;
}

let host: InsertHost | null = null;

export const insertBus = {
  set(next: InsertHost | null): void {
    host = next;
  },
  clear(owner: InsertHost): void {
    if (host === owner) {
      host = null;
    }
  },
  get: (): InsertHost | null => host,
};
