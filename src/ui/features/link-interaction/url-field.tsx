import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { cleanLinkUrl } from "./deps.js";
import type { PrototypeLink } from "./deps.js";
import { urlOf } from "./interaction-model.js";
import { TextCommitField } from "./text-commit-field.js";
import type { Interaction } from "./use-link-interaction.js";

interface UrlFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const isUrl = (text: string): boolean => cleanLinkUrl(text) !== null;

const UrlField = ({ interaction, link }: UrlFieldProps): ReactElement => (
  <TextCommitField
    isValid={isUrl}
    label={copy.url}
    placeholder={copy.urlHint}
    size="url"
    type="url"
    value={urlOf(link.to) ?? ""}
    onCommit={interaction.handleUrl}
  />
);

export { UrlField };

export type { UrlFieldProps };
