import { HttpApiSchema } from "effect/http-api";

import {
  BAD_REQUEST,
  BadRequest,
  Conflict,
  CONFLICT,
} from "../../shared-actions.js";
import { MEMBER_ERRORS } from "../groups/wire-errors.js";

const BadRequestWire = BadRequest.pipe(HttpApiSchema.status(BAD_REQUEST));

const ConflictWire = Conflict.pipe(HttpApiSchema.status(CONFLICT));

const SYNC_ERRORS = [...MEMBER_ERRORS, BadRequestWire, ConflictWire] as const;

export { BadRequestWire, ConflictWire, SYNC_ERRORS };
