const keyName = (property) => {
  if (property.type !== "Property") {
    return null;
  }

  if (property.key.type === "Identifier") {
    return property.key.name;
  }

  if (property.key.type === "Literal") {
    return String(property.key.value);
  }

  return null;
};

const propertyOf = (objectNode, key) =>
  objectNode.properties.find((property) => keyName(property) === key) ?? null;

const stringOf = (node) => {
  if (node && node.type === "Literal" && node.value === String(node.value)) {
    return node.value;
  }

  return null;
};

const fieldOf = (objectNode, key) => {
  const property = propertyOf(objectNode, key);

  if (property === null) {
    return null;
  }

  return property.value;
};

const stringAt = (objectNode, key) => stringOf(fieldOf(objectNode, key));

const specOf = (call) => {
  const [first] = call.arguments;

  const isDefine =
    call.callee.type === "Identifier" && call.callee.name === "defineAction";

  if (isDefine && first && first.type === "ObjectExpression") {
    return first;
  }

  return null;
};

const verbOf = (id) => {
  const [, tail = ""] = id.split(".");
  const match = /^[a-z]+/u.exec(tail);

  if (match === null) {
    return "";
  }

  return match[0];
};

const lastName = (node) => {
  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "MemberExpression" && !node.computed) {
    return node.property.name;
  }

  return null;
};

const rule = (create) => ({
  create,
  meta: { schema: [], type: "problem" },
});

export {
  fieldOf,
  keyName,
  lastName,
  propertyOf,
  rule,
  specOf,
  stringAt,
  verbOf,
};
