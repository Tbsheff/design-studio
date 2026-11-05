import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { toWire } from "@design-studio/actions/_core/wire";

const FORBIDDEN_BODY = toWire(
  new Forbidden({
    message: "This request is not allowed on the MCP port.",
    perm: "mcp",
  })
);

const UNAUTHORIZED_BODY = toWire(
  new Unauthenticated({ message: "Send a valid MCP key as a Bearer token." })
);

const OFFLINE_BODY = toWire(
  new Unavailable({ message: "The MCP key check is offline." })
);

const TOO_LARGE_BODY = toWire(
  new BadRequest({ message: "The MCP request body is too large." })
);

const NOT_FOUND_BODY = toWire(
  new NotFound({ message: "This MCP route does not exist." })
);

export {
  FORBIDDEN_BODY,
  NOT_FOUND_BODY,
  OFFLINE_BODY,
  TOO_LARGE_BODY,
  UNAUTHORIZED_BODY,
};
