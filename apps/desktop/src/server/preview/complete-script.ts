import {
  projectPreviewHost,
  STUDIO_TOKEN_HEADER,
} from "@design-studio/contracts";

const COMPLETE_POST_PATH = "/__studio/complete";

const COMPLETE_SCRIPT = `(function () {
  var host = window.studio || {};
  window.studio = host;
  host.complete = function complete(input) {
    var body = typeof input === "string" ? { prompt: input } : Object.assign({}, input);
    body.frame = window.location.pathname;
    return fetch("${COMPLETE_POST_PATH}", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().then(function (json) {
        if (!response.ok) {
          throw new Error((json && json.message) || "The completion failed.");
        }
        return json.text;
      });
    });
  };
})();
`;

const HOST_PATTERN = /^p-(?<hex>(?:[0-9a-f]{2})+)\.localhost(?::\d+)?$/u;

const SAFE_ID = /^[A-Za-z0-9_.-]+$/u;

const HEX_RADIX = 16;

const BODY_MAX_CHARS = 200_000;

const toProjectIdFromHost = (hostHeader: string | null): string | null => {
  const hex = HOST_PATTERN.exec((hostHeader ?? "").toLowerCase())?.groups?.hex;

  if (!hex) {
    return null;
  }

  const bytes = hex
    .match(/../gu)
    ?.map((pair) => Number.parseInt(pair, HEX_RADIX));

  const projectId = new TextDecoder().decode(new Uint8Array(bytes ?? []));

  const [hostName = ""] = (hostHeader ?? "").toLowerCase().split(":");

  if (!SAFE_ID.test(projectId) || projectPreviewHost(projectId) !== hostName) {
    return null;
  }

  return projectId;
};

interface CompleteForward {
  readonly body: string;
  readonly status: number;
}

const BAD_REQUEST_STATUS = 400;

const runCompleteForward = async (
  studioOrigin: string,
  studioToken: string,
  projectId: string,
  raw: string
): Promise<CompleteForward> => {
  if (raw.length > BODY_MAX_CHARS) {
    return {
      body: JSON.stringify({ message: "The completion request is too long." }),
      status: BAD_REQUEST_STATUS,
    };
  }

  const response = await fetch(
    `${studioOrigin}/api/projects/${projectId}/completions`,
    {
      body: raw,
      headers: {
        [STUDIO_TOKEN_HEADER]: studioToken,
        "content-type": "application/json",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    return { body: await response.text(), status: response.status };
  }

  return { body: await response.text(), status: response.status };
};

export {
  COMPLETE_POST_PATH,
  COMPLETE_SCRIPT,
  runCompleteForward,
  toProjectIdFromHost,
};

export type { CompleteForward };
