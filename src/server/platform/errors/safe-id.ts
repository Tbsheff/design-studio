import { BadRequestError } from "./bad-request.js";

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/u;

const assertSafeId = (value: string, label: string): string => {
  if (!SAFE_ID.test(value)) {
    throw new BadRequestError(`invalid ${label}`);
  }

  return value;
};

export { assertSafeId };
