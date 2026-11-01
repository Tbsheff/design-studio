const RULES: [RegExp, string][] = [
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g, "[jwt]"],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [hidden]"],
  [
    /\b([A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD)[A-Z0-9_]*)\s*[=:]\s*\S+/g,
    "$1=[hidden]",
  ],
  [
    /([?&](?:code|state|code_challenge|access_token|refresh_token|token)=)[^&\s]+/gi,
    "$1[hidden]",
  ],
  [
    /"(access_token|refresh_token|oauth_token|api_token|token)"\s*:\s*"[^"]*"/gi,
    '"$1":"[hidden]"',
  ],
  [/\b[A-Za-z0-9_-]{40,}\b/g, "[hidden]"],
];

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g;

export function scrubCliText(text: string, extra: string[] = []): string {
  let out = text.replaceAll(ANSI, "");

  for (const secret of extra) {
    if (secret.length >= 4) {
      out = out.split(secret).join("[hidden]");
    }
  }

  for (const [pattern, replace] of RULES) {
    out = out.replace(pattern, replace);
  }

  return out;
}

export function tailLines(text: string, max = 60): string {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  return lines.slice(-max).join("\n");
}
