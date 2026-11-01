import { STUDIO_TOKEN_HEADER } from "../../shared/contracts";
import { getSession } from "../session";

type TokenHeaders = Readonly<Record<typeof STUDIO_TOKEN_HEADER, string>>;

const tokenHeaders = (): TokenHeaders => ({
  [STUDIO_TOKEN_HEADER]: getSession().token,
});

export { getSession, loadSession, randomToken } from "../session";

export { tokenHeaders };

export type { TokenHeaders };
