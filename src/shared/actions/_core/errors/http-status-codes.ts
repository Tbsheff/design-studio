const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const GONE = 410;
const UNPROCESSABLE = 422;
const TOO_MANY_REQUESTS = 429;
const DEFECT = 500;
const NOT_IMPLEMENTED = 501;
const BAD_GATEWAY = 502;
const UNAVAILABLE = 503;

type HttpStatus =
  | typeof BAD_GATEWAY
  | typeof BAD_REQUEST
  | typeof CONFLICT
  | typeof DEFECT
  | typeof FORBIDDEN
  | typeof GONE
  | typeof NOT_FOUND
  | typeof NOT_IMPLEMENTED
  | typeof TOO_MANY_REQUESTS
  | typeof UNAUTHORIZED
  | typeof UNAVAILABLE
  | typeof UNPROCESSABLE;

export {
  BAD_GATEWAY,
  BAD_REQUEST,
  CONFLICT,
  DEFECT,
  FORBIDDEN,
  GONE,
  NOT_FOUND,
  NOT_IMPLEMENTED,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
  UNAVAILABLE,
  UNPROCESSABLE,
};

export type { HttpStatus };
