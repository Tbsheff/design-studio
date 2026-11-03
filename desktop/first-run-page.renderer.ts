interface CheckResult {
  id: string;
  label: string;
  status: "fail" | "ok" | "warn";
  required: boolean;
  detail: string;
  fixes: string[];
}

interface SetupBridge {
  run: () => Promise<CheckResult[]>;
  fix: (action: string) => Promise<void>;
  info: () => Promise<{ continueLabel: string } | null>;
  done: () => Promise<void>;
}

const MARKS = { fail: "✕", ok: "✓", warn: "!" };

const FIX_LABELS = {
  "copy-claude": "Copy “claude”",
  "copy-claude-install": "Copy install command",
  "install-clt": "Install Command Line Tools",
  "open-terminal": "Open Terminal",
  "reveal-data": "Show data folder",
} satisfies Record<string, string>;

const toFixLabel = (action: string): string =>
  Object.entries(FIX_LABELS).find(([key]) => key === action)?.[1] ?? action;

const settle = async (task: Promise<unknown>): Promise<void> => {
  try {
    await task;
  } catch {
    await Promise.resolve(null);
  }
};

const fire = (task: Promise<unknown>): void => {
  void settle(task);
};

const element = <Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className: string,
  text: string
): HTMLElementTagNameMap[Tag] => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;

  return node;
};

const fixButton = (bridge: SetupBridge, action: string): HTMLButtonElement => {
  const button = element("button", "fix", toFixLabel(action));
  button.type = "button";
  button.dataset["fix"] = action;
  button.addEventListener("click", () => fire(bridge.fix(action)));

  return button;
};

const row = (bridge: SetupBridge, result: CheckResult): HTMLLIElement => {
  const item = element("li", "check", "");
  item.dataset["check"] = result.id;
  item.dataset["status"] = result.status;
  const label = element("span", "label", result.label);

  if (!result.required) {
    label.append(element("span", "optional", " (optional)"));
  }

  item.append(
    element("span", "mark", MARKS[result.status]),
    label,
    element("span", "detail", result.detail)
  );

  if (result.fixes.length > 0) {
    const fixes = element("div", "fixes", "");
    fixes.append(...result.fixes.map((action) => fixButton(bridge, action)));
    item.append(fixes);
  }

  return item;
};

const refresh = async (bridge: SetupBridge): Promise<void> => {
  const list = document.querySelector("#checks");

  if (!list) {
    return;
  }

  list.replaceChildren(element("li", "pending", "Checking…"));
  const results = await bridge.run();
  list.replaceChildren(...results.map((result) => row(bridge, result)));
  document.body.dataset["ready"] = "true";
};

const startFirstRunPage = async (): Promise<void> => {
  const bridge = (globalThis as { studioSetup?: SetupBridge }).studioSetup;

  if (!bridge) {
    return;
  }

  if (navigator.userAgent.includes("Mac OS X")) {
    document.documentElement.dataset["shell"] = "mac";
  }

  const info = await bridge.info();
  const next = document.querySelector("#continue");

  if (next && info) {
    next.textContent = info.continueLabel;
  }

  next?.addEventListener("click", () => fire(bridge.done()));
  document
    .querySelector("#recheck")
    ?.addEventListener("click", () => fire(refresh(bridge)));
  await refresh(bridge);
};

export { startFirstRunPage };

export type { CheckResult, SetupBridge };
