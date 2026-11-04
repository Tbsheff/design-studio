import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import {
  BAD_REQUEST,
  CONFLICT,
} from "@design-studio/actions/_core/errors/http-status-codes";
import { HttpApiSchema } from "effect/http-api";

import { MEMBER_ERRORS } from "../groups/wire-errors.js";

const BadRequestWire = BadRequest.pipe(HttpApiSchema.status(BAD_REQUEST));

const ConflictWire = Conflict.pipe(HttpApiSchema.status(CONFLICT));

const SYNC_ERRORS = [...MEMBER_ERRORS, BadRequestWire, ConflictWire] as const;

export { BadRequestWire, ConflictWire, SYNC_ERRORS };
