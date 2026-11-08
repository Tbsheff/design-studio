import type { AppServerStatus } from "@design-studio/contracts";
import { parseEnvText } from "@design-studio/contracts/app";

const envSuggestion = (
  status: AppServerStatus | null
): Record<string, string> | null => {
  const fix = status?.doctor?.causes.find(
    (cause) => cause.fix?.kind === "set-env"
  )?.fix;

  if (fix?.kind === "set-env") {
    return fix.env;
  }

  return null;
};

const isEnvSet = (suggested: Record<string, string>, env: string): boolean => {
  const current = parseEnvText(env).env;

  return Object.keys(suggested).every((key) => key in current);
};

export { envSuggestion, isEnvSet };
