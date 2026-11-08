import { TWEAKS_TOOL } from "../../../shared/tweaks.js";

const EDIT_ELEMENT_TOOL = "mcp__studio__edit_element";
const SET_PROPS_TOOL = "mcp__studio__set_props";
const INSERT_COMPONENT_TOOL = "mcp__studio__insert_component";
const FIND_STYLES_TOOL = "mcp__studio__find_styles";
const REPLACE_STYLE_TOOL = "mcp__studio__replace_style";
const ARRANGE_TOOL = "mcp__studio__arrange";
const MEASURE_TOOL = "mcp__studio__measure";
const SELECT_MATCHING_TOOL = "mcp__studio__select_matching";
const REVIEW_FRAME_TOOL = "mcp__studio__review_frame";
const GET_LAYERS_TOOL = "mcp__studio__get_layers";
const CREATE_COMPONENT_TOOL = "mcp__studio__create_component";
const SWAP_INSTANCE_TOOL = "mcp__studio__swap_instance";
const SET_IMAGE_TOOL = "mcp__studio__set_image";
const LIST_LOCKS_MCP = "mcp__studio__list_locked_layers";

const STUDIO_EDIT_TOOLS_R13: readonly string[] = [
  "mcp__studio__import_figma_frame",
  "mcp__studio__set_layer_state",
  "mcp__studio__draw_vector",
  "mcp__studio__boolean_shapes",
  "mcp__studio__paint_shape",
];

const DIRECT_EDIT_AGENT_TOOLS: readonly string[] = [
  TWEAKS_TOOL,
  EDIT_ELEMENT_TOOL,
  SET_PROPS_TOOL,
  FIND_STYLES_TOOL,
  REPLACE_STYLE_TOOL,
  INSERT_COMPONENT_TOOL,
  REVIEW_FRAME_TOOL,
  GET_LAYERS_TOOL,
  ARRANGE_TOOL,
  MEASURE_TOOL,
  CREATE_COMPONENT_TOOL,
  SWAP_INSTANCE_TOOL,
  SELECT_MATCHING_TOOL,
  SET_IMAGE_TOOL,
  ...STUDIO_EDIT_TOOLS_R13,
  LIST_LOCKS_MCP,
];

export {
  ARRANGE_TOOL,
  CREATE_COMPONENT_TOOL,
  DIRECT_EDIT_AGENT_TOOLS,
  EDIT_ELEMENT_TOOL,
  FIND_STYLES_TOOL,
  GET_LAYERS_TOOL,
  INSERT_COMPONENT_TOOL,
  LIST_LOCKS_MCP,
  MEASURE_TOOL,
  REPLACE_STYLE_TOOL,
  REVIEW_FRAME_TOOL,
  SELECT_MATCHING_TOOL,
  SET_IMAGE_TOOL,
  SET_PROPS_TOOL,
  STUDIO_EDIT_TOOLS_R13,
  SWAP_INSTANCE_TOOL,
};
