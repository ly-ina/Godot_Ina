// MCP Tool: add_node — add a node to an existing scene
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { SceneNode } from "../parsers/tscn-types.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { findNodeInTree, getNodePath, isValidNodeType } from "../utils/tree-utils.js";
import * as fs from "fs";
import * as path from "path";

export interface AddNodeArgs {
  /** Path to the .tscn scene file */
  scene_path: string;
  /** Name of the parent node (or "." for root level) */
  parent_node_name: string;
  /** Type of the new node (e.g., "Sprite2D", "CharacterBody2D") */
  node_type: string;
  /** Name for the new node */
  node_name: string;
  /** Optional initial properties */
  properties?: Record<string, unknown>;
}

/**
 * Add a node to a .tscn scene file
 */
export function addNode(args: AddNodeArgs): string {
  const { scene_path, parent_node_name, node_type, node_name, properties } = args;

  // Validate inputs
  if (!scene_path || !scene_path.endsWith(".tscn")) {
    throw new Error("scene_path must point to a .tscn file");
  }
  if (!parent_node_name) {
    throw new Error("parent_node_name is required (use '.' for root level)");
  }
  if (!node_type) {
    throw new Error("node_type is required (e.g., 'Sprite2D', 'CharacterBody2D')");
  }
  if (!node_name) {
    throw new Error("node_name is required");
  }

  // Check file exists
  if (!fs.existsSync(scene_path)) {
    throw new Error(`Scene file not found: ${scene_path}`);
  }

  // Parse the scene
  const scene = parseTscnFile(scene_path);
  if (!scene.rootNode) {
    throw new Error("Scene has no root node — cannot add node");
  }

  // Find the parent node
  let parentNode: SceneNode | null;
  if (parent_node_name === ".") {
    parentNode = scene.rootNode;
  } else {
    parentNode = findNodeInTree(scene.rootNode, parent_node_name);
  }

  if (!parentNode) {
    throw new Error(
      `Parent node "${parent_node_name}" not found in scene. ` +
      `Available nodes: ${listNodeNames(scene.rootNode)}`
    );
  }

  // Check for duplicate node name
  const existing = findNodeInTree(scene.rootNode, node_name);
  if (existing) {
    throw new Error(
      `A node named "${node_name}" already exists in the scene. Choose a different name.`
    );
  }

  // Create the new node
  const newNode: SceneNode = {
    name: node_name,
    type: node_type,
    parent: parentNode.name,
    properties: properties || {},
    children: [],
  };

  // Add to parent
  parentNode.children.push(newNode);

  // Update load_steps count (rough estimate: +2 for the new node + any sub-resources)
  // In a full implementation we'd count ext_resources + sub_resources + nodes + connections
  // For now, just increment by 1
  scene.header.loadSteps = Math.max(scene.header.loadSteps, scene.header.loadSteps + 1);

  // Write back
  writeSceneToFile(scene, scene_path);

  // Compute parent path for display
  const parentPath = parent_node_name === "." ? "root" : parent_node_name;

  return (
    `Added node "${node_name}" (${node_type}) to scene: ${path.basename(scene_path)}\n` +
    `Parent: ${parentPath}\n` +
    `Properties set: ${Object.keys(properties || {}).length}`
  );
}

/**
 * List all node names in the tree (for error messages)
 */
function listNodeNames(node: SceneNode): string {
  const names: string[] = [];
  collectNames(node, names);
  return names.join(", ");
}

function collectNames(node: SceneNode, names: string[]): void {
  names.push(node.name);
  for (const child of node.children) {
    collectNames(child, names);
  }
}
