// MCP Tool: edit_node — modify properties of a node in a .tscn scene
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { findNodeInTree } from "../utils/tree-utils.js";
import * as fs from "fs";
import * as path from "path";

export interface EditNodeArgs {
  /** Path to the .tscn scene file */
  scene_path: string;
  /** Name of the node to edit */
  node_name: string;
  /** Properties to update (key-value pairs) */
  properties: Record<string, unknown>;
}

/**
 * Edit properties of a node in a .tscn scene file.
 * Properties are merged: existing keys are overwritten, new keys are added.
 * To remove a property, set its value to null.
 */
export function editNode(args: EditNodeArgs): string {
  const { scene_path, node_name, properties } = args;

  // Validate inputs
  if (!scene_path || !scene_path.endsWith(".tscn")) {
    throw new Error("scene_path must point to a .tscn file");
  }
  if (!node_name) {
    throw new Error("node_name is required");
  }
  if (!properties || Object.keys(properties).length === 0) {
    throw new Error("properties is required — provide at least one property to change");
  }

  // Check file exists
  if (!fs.existsSync(scene_path)) {
    throw new Error(`Scene file not found: ${scene_path}`);
  }

  // Parse the scene
  const scene = parseTscnFile(scene_path);
  if (!scene.rootNode) {
    throw new Error("Scene has no root node");
  }

  // Find the node
  const node = findNodeInTree(scene.rootNode, node_name);
  if (!node) {
    throw new Error(`Node "${node_name}" not found in scene`);
  }

  // Track changes
  const updated: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) {
      // Remove property
      if (key in node.properties) {
        delete node.properties[key];
        removed.push(key);
      }
    } else {
      // Set or update property
      const wasPresent = key in node.properties;
      node.properties[key] = value;
      if (wasPresent) {
        updated.push(key);
      } else {
        added.push(key);
      }
    }
  }

  // Write back
  writeSceneToFile(scene, scene_path);

  // Build result message
  const parts: string[] = [
    `Updated node "${node_name}" in ${path.basename(scene_path)}:`,
  ];
  if (updated.length > 0) parts.push(`  Updated: ${updated.join(", ")}`);
  if (added.length > 0) parts.push(`  Added: ${added.join(", ")}`);
  if (removed.length > 0) parts.push(`  Removed: ${removed.join(", ")}`);

  return parts.join("\n");
}
