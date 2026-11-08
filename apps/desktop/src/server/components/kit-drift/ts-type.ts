import type ts from "typescript-api";
import type {
  CallExpression,
  Expression,
  JsxAttribute,
  JsxAttributeLike,
  JsxElement,
  JsxExpression,
  JsxSelfClosingElement,
  Node,
  PropertyName,
  SourceFile,
} from "typescript-api";

type Ts = typeof ts;

export type {
  CallExpression as TsCallExpression,
  Expression as TsExpression,
  JsxAttribute as TsJsxAttribute,
  JsxAttributeLike as TsJsxAttributeLike,
  JsxElement as TsJsxElement,
  JsxExpression as TsJsxExpression,
  JsxSelfClosingElement as TsJsxSelfClosingElement,
  Node as TsNode,
  PropertyName as TsPropertyName,
  SourceFile as TsSourceFile,
  Ts,
};
