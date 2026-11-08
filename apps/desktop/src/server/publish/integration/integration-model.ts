import type { IntegrationSchema } from "@design-studio/actions/integration/schema";

type StoredIntegration = typeof IntegrationSchema.Type;

interface IntegrationPage {
  readonly items: readonly StoredIntegration[];
  readonly next: string | null;
}

interface IntegrationListCommand {
  readonly cursor: string | null;
  readonly limit: number;
}

const RESERVED_NAMES: ReadonlySet<string> = new Set(["studio"]);

const SECRET_MASK = "[secret]";

const toMasked = (text: string, secret: string | null): string => {
  if (secret === null || secret === "") {
    return text;
  }

  return text.split(secret).join(SECRET_MASK);
};

export { RESERVED_NAMES, toMasked };

export type { IntegrationListCommand, IntegrationPage, StoredIntegration };
