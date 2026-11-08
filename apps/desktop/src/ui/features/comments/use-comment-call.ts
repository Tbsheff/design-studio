import { useCallback } from "react";
import type { MutableRefObject } from "react";

import { toBase } from "./comments-api.js";
import { json } from "./deps.js";
import type { JsonBody } from "./deps.js";

type CommentCall = <Result>(
  method: string,
  suffix: string,
  body?: JsonBody
) => Promise<Result | null>;

const useCommentCall = (
  projectId: string,
  didRef: MutableRefObject<string | null>
): CommentCall =>
  useCallback(
    <Result>(
      method: string,
      suffix: string,
      body?: JsonBody
    ): Promise<Result | null> => {
      const did = didRef.current;

      if (!did) {
        return Promise.resolve(null);
      }

      return json<Result>(method, `${toBase(projectId, did)}${suffix}`, body);
    },
    [projectId, didRef]
  );

export { useCommentCall };

export type { CommentCall };
