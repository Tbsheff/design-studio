import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import type { RunUsage } from "@design-studio/contracts";

interface RawUsage {
  readonly input_tokens?: number | null;
  readonly output_tokens?: number | null;
  readonly cache_read_input_tokens?: number | null;
  readonly cache_creation_input_tokens?: number | null;
}

const toRunUsage = (raw: RawUsage | null | undefined): RunUsage => ({
  cacheReadTokens: raw?.cache_read_input_tokens ?? 0,
  cacheWriteTokens: raw?.cache_creation_input_tokens ?? 0,
  inputTokens: raw?.input_tokens ?? 0,
  outputTokens: raw?.output_tokens ?? 0,
});

const toContextTokens = (usage: RawUsage | undefined): number =>
  (usage?.input_tokens ?? 0) +
  (usage?.cache_read_input_tokens ?? 0) +
  (usage?.cache_creation_input_tokens ?? 0);

const toContextWindow = (result: SDKResultMessage): number | null => {
  let largest: number | null = null;

  for (const entry of Object.values(result.modelUsage ?? {})) {
    const size = entry.contextWindow;

    if (Number.isFinite(size) && size > (largest ?? 0)) {
      largest = size;
    }
  }

  return largest;
};

export { toContextTokens, toContextWindow, toRunUsage };

export type { RawUsage };
