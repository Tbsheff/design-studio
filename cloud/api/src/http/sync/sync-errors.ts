import { HttpApiSchema } from "effect/http-api";

import { BadRequest } from "../../../../../../src/shared/actions/_core/errors/bad-request.js";
import { Conflict } from "../../../../../../src/shared/actions/_core/errors/conflict.js";
import {
  BAD_REQUEST,
  CONFLICT,
} from "../../../../../../src/shared/actions/_core/errors/http-status-codes.js";
import { MEMBER_ERRORS } from "../groups/wire-errors.js";

const BadRequestWire = BadRequest.pipe(HttpApiSchema.status(BAD_REQUEST));

const ConflictWire = Conflict.pipe(HttpApiSchema.status(CONFLICT));

const SYNC_ERRORS = [...MEMBER_ERRORS, BadRequestWire, ConflictWire] as const;

export { BadRequestWire, ConflictWire, SYNC_ERRORS };
