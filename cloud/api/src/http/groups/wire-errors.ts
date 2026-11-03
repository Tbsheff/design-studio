import { HttpApiSchema } from "effect/http-api";

import { Forbidden } from "../../../../../src/shared/actions/_core/errors/forbidden.js";
import {
  FORBIDDEN,
  NOT_FOUND,
  UNAUTHORIZED,
} from "../../../../../src/shared/actions/_core/errors/http-status-codes.js";
import { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import { NotImplemented } from "../../../../../src/shared/actions/_core/errors/not-implemented.js";
import { Unauthenticated } from "../../../../../src/shared/actions/_core/errors/unauthenticated.js";

const NOT_IMPLEMENTED = 501;

const ForbiddenWire = Forbidden.pipe(HttpApiSchema.status(FORBIDDEN));

const NotFoundWire = NotFound.pipe(HttpApiSchema.status(NOT_FOUND));

const NotImplementedWire = NotImplemented.pipe(
  HttpApiSchema.status(NOT_IMPLEMENTED)
);

const UnauthenticatedWire = Unauthenticated.pipe(
  HttpApiSchema.status(UNAUTHORIZED)
);

const MEMBER_ERRORS = [
  ForbiddenWire,
  NotFoundWire,
  UnauthenticatedWire,
] as const;

const ROUTE_ERRORS = [
  ForbiddenWire,
  NotFoundWire,
  NotImplementedWire,
  UnauthenticatedWire,
] as const;

export {
  ForbiddenWire,
  MEMBER_ERRORS,
  NotFoundWire,
  NotImplementedWire,
  ROUTE_ERRORS,
  UnauthenticatedWire,
};
