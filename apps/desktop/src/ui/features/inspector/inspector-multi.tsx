import type {
  BridgeToParent,
  CreateTokenResult,
  MatchKind,
  SelectionContext,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { memo, useSyncExternalStore } from "react";
import type { MutableRefObject, ReactElement } from "react";

import { cssVarFor } from "../../../shared/token-match.js";
import { api } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { CreateTokenDialog } from "../versions-layers-tokens/create-token-dialog.js";
import type { CreateTokenSubmit } from "../versions-layers-tokens/create-token-dialog.js";
import { copy } from "./copy.js";
import type { StyleValues } from "./css-value-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { NumberField } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";
import type { CreateRequest } from "./use-token-snap.js";

const MultiNote = ({
  reason,
}: {
  readonly reason: string | null;
}): ReactElement | null => {
  if (!reason) {
    return null;
  }

  return (
    <div className="ins-multi-note" role="note">
      <Icon name="alert" size={14} />
      <span>{reason}</span>
    </div>
  );
};

const MultiSizeSection = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => (
  <InspectorSection title={copy.size}>
    <div className="ins-grid">
      <NumberField
        short="W"
        spec={{ edit, label: "Width", min: 0, prop: "width" }}
      />
      <NumberField
        short="H"
        spec={{ edit, label: "Height", min: 0, prop: "height" }}
      />
    </div>
  </InspectorSection>
);

interface HostProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly tokens: DesignTokens | null;
  readonly edit: DirectEdit;
  readonly request: CreateRequest | null;
  readonly onClose: () => void;
}

const MultiCreateTokenHost = ({
  projectId,
  directionId,
  tokens,
  edit,
  request,
  onClose,
}: HostProps): ReactElement | null => {
  if (!tokens || !request) {
    return null;
  }

  const submit = async (
    input: CreateTokenSubmit
  ): Promise<CreateTokenResult> => {
    if (!directionId) {
      throw new Error("No direction selected");
    }

    await edit.drain();

    const result = await api.createToken(projectId, directionId, {
      group: input.group,
      name: input.name,
      value: input.value,
      ...(input.darkValue ? { darkValue: input.darkValue } : {}),
    });

    tokens.replace(result.state);

    if (input.apply) {
      const cssVar = cssVarFor(input.group, input.name);

      const style: Partial<StyleValues> = Object.fromEntries(
        request.targets.map((part) => [part, `var(${cssVar})`])
      );

      edit.preview(style);
      edit.commit();
    }

    return result;
  };

  return (
    <CreateTokenDialog
      request={request}
      entries={tokens.entries}
      onSubmit={submit}
      onClose={onClose}
    />
  );
};

const MATCH_OPTIONS: {
  readonly by: MatchKind;
  readonly label: string;
  readonly tip: string;
}[] = [
  {
    by: "component",
    label: "Component",
    tip: "Select every copy of this component or element",
  },
  {
    by: "classes",
    label: "Classes",
    tip: "Select elements with exactly the same classes",
  },
  {
    by: "text-style",
    label: "Text style",
    tip: "Select text with the same font, size, weight, line height and tracking",
  },
];

const MATCH_WAIT_MS = 5000;
const MATCH_NOTE_MS = 6000;

let matchNote: { readonly text: string; readonly at: number } | null = null;
let matchSeq = 0;
const matchSubs = new Set<() => void>();

const setMatchNote = (text: string | null): void => {
  matchNote = text ? { at: Date.now(), text } : null;

  for (const sub of matchSubs) {
    sub();
  }
};

const subscribeMatch = (sub: () => void): (() => void) => {
  matchSubs.add(sub);

  return () => matchSubs.delete(sub);
};

const matchedText = (
  message: Extract<BridgeToParent, { readonly type: "matched" }>
): string => {
  if (message.note) {
    return message.note;
  }

  return message.count <= 1
    ? "No other element matches."
    : `Selected ${message.count} matching elements.`;
};

const askMatching = (
  port: PreviewPort,
  selector: string,
  by: MatchKind
): void => {
  matchSeq += 1;
  const requestId = `match-${matchSeq}`;
  setMatchNote(null);

  const stop = port.listen?.((message) => {
    if (message.type !== "matched" || message.requestId !== requestId) {
      return;
    }

    done();
    setMatchNote(matchedText(message));
  });

  const timer = globalThis.setTimeout(() => done(), MATCH_WAIT_MS);

  const done = (): void => {
    globalThis.clearTimeout(timer);
    stop?.();
  };

  port.post({ by, requestId, selector, type: "select-matching" });
};

const SelectMatchingView = ({
  selection,
  port,
}: {
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
}): ReactElement | null => {
  const note = useSyncExternalStore(subscribeMatch, () => matchNote);
  const base = selection.at(-1);

  if (!base) {
    return null;
  }

  const fresh = note && Date.now() - note.at < MATCH_NOTE_MS ? note.text : null;

  return (
    <InspectorSection title={copy.selectMatching}>
      <div
        className="ins-add-links ins-select-matching"
        role="group"
        aria-label={copy.selectMatching}
      >
        {MATCH_OPTIONS.map((option) => (
          <button
            key={option.by}
            type="button"
            className="ins-add-link"
            data-tip={option.tip}
            onClick={() =>
              port.current &&
              askMatching(port.current, base.selector, option.by)
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      {fresh && (
        <p className="ins-select-matching-note" role="status">
          {fresh}
        </p>
      )}
    </InspectorSection>
  );
};

const SelectMatchingSection = memo(
  SelectMatchingView,
  (first, second) =>
    first.port === second.port &&
    first.selection.length === second.selection.length &&
    first.selection.every((item, index) => item === second.selection[index])
);

export {
  MultiNote,
  MultiSizeSection,
  MultiCreateTokenHost,
  SelectMatchingSection,
};
