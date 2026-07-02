// MCP Tool: delete_node — remove a node from a .tscn scene file
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { findNodeInTree, countNodes } from "../utils/tree-utils.js";
import * as fs from "fs";
import * as path from "path";

export interface DeleteNodeArgs {
  /** Path to the .tscn scene file */
  scene_path: string;
  /** Name of the node to delete */
  node_name: string;
  /** Whether to delete child nodes as well (default: false — warns if node has children) */
  recursive?: boolean;
}

/**
 * Remove a node from a .tscn scene file.
 * By default, refuses to delete a node that has children (use recursive: true to force).
 */
export function deleteNode(args: DeleteNodeArgs): string {
  const { scene_path, node_name, recursive = false } = args;

  // Validate inputs
  if (!scene_path) {
    throw new Error("scene_path is required");
  }
  if (!scene_path.endsWith(".tscn")) {
    throw new Error("scene_path must point to a .tscn file");
  }
  if (!node_name) {
    throw new Error("node_name is required");
  }
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

  // Check if it's the root node
  if (node === scene.rootNode) {
    throw new Error("Cannot delete the root node of the scene");
  }

  // Check for children
  const childCount = countNodes(node) - 1; // subtract the node itself
  if (childCount > 0 && !recursive) {
    throw new Error(
      `Node "${node_name}" has ${childCount} child node(s). ` +
      `Use recursive: true to delete children as well, ` +
      `or move/delete children first.`
    );
  }

  // Remove the node from its parent
  const removed = removeFromTree(scene.rootNode, node_name);
  if (!removed) {
    throw new Error(`Failed to remove node "${node_name}" from tree`);
  }

  // Write the scene back
  writeSceneToFile(scene, scene_path);

  const childNote = childCount > 0 ? ` (including ${childCount} child node(s))` : "";
  return `Deleted node "${node_name}"${childNote} from ${path.basename(scene_path)}`;
}

/**
 * Recursively search for and remove a child node by name.
 * Returns true if found and removed.
 */
function removeFromTree(parent: { name: string; children: Array<{ name: string; children: Array<unknown> }> }, targetName: string): boolean {
  const idx = parent.children.findIndex(c => c.name === targetName);
  if (idx !== -1) {
    parent.children.splice(idx, 1);
    return true;
  }
  for (const child of parent.children) {
    if (removeFromTree(child as { name: string; children: Array<{ name: string; children: Array<unknown> }> }, targetName)) {
      return true;
    }
  }
  return false;
}
