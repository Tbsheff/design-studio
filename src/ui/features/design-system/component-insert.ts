import { routes } from "../../../shared/actions/direct-edit/routes.js";
import type {
  InsertComponentRequest,
  InsertJsxRequest,
  InsertPosition,
  InsertableComponent,
} from "../../../shared/insert.js";
import { ApiError } from "../../api.js";
import { call } from "../../platform/http.js";

export const insertApi = {
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
  list: (pid: string, did: string) =>
    call(routes.listInsertableDirectEdit, {
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
  clear(owner: InsertHost): void {
    if (host === owner) {
      host = null;
    }
  },
  get: (): InsertHost | null => host,
  set(next: InsertHost | null): void {
    host = next;
  },
};
