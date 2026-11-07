import { routes } from "@design-studio/actions/workspace/routes";
import { isSharedLayout } from "@design-studio/contracts/usage-scope";
import type {
  ComponentUsage,
  EditScope,
  EditScopeChoice,
} from "@design-studio/contracts/usage-scope";
import { Icon } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { call } from "../../platform/http.js";
import { uiStore } from "../../platform/storage.js";
import { copy } from "./copy.js";

import "../../styles/inline-prompt.css";
import type { InlinePromptView } from "./use-inline-prompt.js";

const BOX_ROOM = 72;
const BOX_WIDTH = 320;

interface Props {
  view: InlinePromptView;
  zoom: number;
  frame: { width: number; height: number };
}

interface UsageFields {
  file: string;
  projectId: string;
  route?: string;
  usedAt?: string;
}

const usageInput = (
  projectId: string,
  file: string,
  usedAt: string | null,
  route: string | null
): UsageFields => {
  const fields: UsageFields = { file, projectId };

  if (usedAt) {
    fields.usedAt = usedAt;
  }

  if (route) {
    fields.route = route;
  }

  return fields;
};

const readUsage = async (
  fields: UsageFields
): Promise<ComponentUsage | null> => {
  try {
    const data: ComponentUsage = await call(routes.getUsageWorkspace, fields);

    return data;
  } catch {
    return null;
  }
};

const useUsage = (
  file: string | null,
  usedAt: string | null,
  route: string | null
): ComponentUsage | null => {
  const [usage, setUsage] = useState<ComponentUsage | null>(null);
  useEffect(() => {
    setUsage(null);
    const projectId = uiStore.get().activeProjectId;

    if (!file || !projectId) {
      return;
    }

    let isLive = true;

    const apply = async (): Promise<void> => {
      const data = await readUsage(usageInput(projectId, file, usedAt, route));

      if (isLive) {
        setUsage(data);
      }
    };

    void apply();

    return () => {
      isLive = false;
    };
  }, [file, usedAt, route]);

  return usage;
};

const scopeOf = (
  usage: ComponentUsage | null,
  choice: EditScopeChoice
): EditScope | undefined => {
  if (!usage || usage.routes.length < 2) {
    return undefined;
  }

  const site = usage.callSite;

  const callSite = site
    ? {
        callSite: { file: site.file, kind: site.kind, pageFile: site.pageFile },
      }
    : {};

  return {
    choice: isSharedLayout(site) ? "all" : choice,
    component: usage.component,
    file: usage.file,
    routes: usage.routes.map((route) => route.route),
    ...callSite,
  };
};

const SharedLayoutNote = ({ usage }: { usage: ComponentUsage }) => {
  const site = usage.callSite;
  const count = Math.max(site?.routes ?? 0, usage.routes.length);

  return (
    <div
      className="inline-prompt-scope inline-prompt-shared"
      role="note"
      data-tip={`${site?.file ?? usage.file} renders this for ${count} routes. A page cannot change its parent layout, so the run changes it on all of them.`}
    >
      Shared layout: this change affects {count} routes
    </div>
  );
};

interface ScopeProps {
  usage: ComponentUsage;
  choice: EditScopeChoice;
  onChoice: (choice: EditScopeChoice) => void;
}

const ScopeChoice = ({ usage, choice, onChoice }: ScopeProps) => {
  const name = usage.component ?? usage.file;

  const options: { id: EditScopeChoice; label: string; tip: string }[] = [
    {
      id: "this",
      label: "This use",
      tip: `Change only this page. ${name} stays as it is.`,
    },
    {
      id: "all",
      label: `All uses (${usage.routes.length})`,
      tip: `Change ${name} on all ${usage.routes.length} routes`,
    },
  ];

  return (
    <div
      className="inline-prompt-scope"
      role="radiogroup"
      aria-label={`Where to change ${name}`}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={choice === option.id}
          className={choice === option.id ? "on" : undefined}
          data-tip={option.tip}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChoice(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default function InlinePrompt({ view, zoom, frame }: Props) {
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<EditScopeChoice>("this");
  const input = useRef<HTMLInputElement>(null);
  const usage = useUsage(view.usageFile, view.usedAtFile, view.route);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  const { rect } = view;

  const above =
    rect.y + rect.height + BOX_ROOM / zoom > frame.height &&
    rect.y > BOX_ROOM / zoom;

  const left = Math.max(0, Math.min(rect.x, frame.width - BOX_WIDTH / zoom));
  const submit = () => view.submit(text, scopeOf(usage, choice));

  const onBoxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      view.close();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const ready = text.trim().length > 0 && !view.blocked;
  const shared = usage && usage.routes.length > 1 ? usage : null;

  return (
    <div
      className="inline-prompt"
      data-testid="inline-prompt"
      style={{
        left,
        top: above ? rect.y : rect.y + rect.height,
        transform: `scale(${1 / zoom}) translateY(${above ? "calc(-100% - 8px)" : "8px"})`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={onBoxKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <div className="inline-prompt-row">
        <span className="inline-prompt-target" data-tip={copy.theRunEdits}>
          <Icon name="sparkle" size={12} />
          <span className="inline-prompt-target-text">{view.label}</span>
        </span>
        <input
          ref={input}
          className="inline-prompt-input"
          value={text}
          placeholder={view.blocked ?? "Ask for a change…"}
          aria-label={`Ask the agent about ${view.label}`}
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="inline-prompt-send"
          disabled={!ready}
          data-tip={view.blocked ?? "Send (Enter)"}
          aria-label={copy.send}
          onClick={submit}
        >
          ↵
        </button>
      </div>
      {shared && isSharedLayout(shared.callSite) ? (
        <SharedLayoutNote usage={shared} />
      ) : null}
      {shared && !isSharedLayout(shared.callSite) ? (
        <ScopeChoice usage={shared} choice={choice} onChoice={setChoice} />
      ) : null}
    </div>
  );
}
