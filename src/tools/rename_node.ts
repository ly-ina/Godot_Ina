// MCP Tool: rename_node — rename a node in a .tscn scene and update references
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { findNodeInTree } from "../utils/tree-utils.js";
import type { SceneNode, Connection } from "../parsers/tscn-types.js";
import * as fs from "fs";
import * as path from "path";

export interface RenameNodeArgs {
  /** Path to the .tscn scene file */
  scene_path: string;
  /** Current name of the node */
  old_name: string;
  /** New name for the node */
  new_name: string;
  /** Also update parent references in child nodes' `parent` fields (default: true) */
  update_parent_refs?: boolean;
  /** Also update connection references pointing to this node (default: true) */
  update_connections?: boolean;
}

/**
 * Rename a node in a .tscn scene.
 * Optionally updates parent references in child nodes and connection references.
 */
export function renameNode(args: RenameNodeArgs): string {
  const { scene_path, old_name, new_name, update_parent_refs = true, update_connections = true } = args;

  if (!scene_path) throw new Error("scene_path is required");
  if (!scene_path.endsWith(".tscn")) throw new Error("scene_path must be a .tscn file");
  if (!old_name) throw new Error("old_name is required");
  if (!new_name) throw new Error("new_name is required");
  if (old_name === new_name) throw new Error("old_name and new_name must be different");
  if (!fs.existsSync(scene_path)) throw new Error(`Scene file not found: ${scene_path}`);

  const scene = parseTscnFile(scene_path);
  if (!scene.rootNode) throw new Error("Scene has no root node");

  // Find the node
  const node = findNodeInTree(scene.rootNode, old_name);
  if (!node) throw new Error(`Node "${old_name}" not found in scene`);

  // Rename
  node.name = new_name;
  let childUpdates = 0;
  let connectionUpdates = 0;

  // Update parent references in child nodes (via the parsed tree)
  if (update_parent_refs) {
    childUpdates = updateParentRefs(node, old_name, new_name);
  }

  // Update connections
  if (update_connections) {
    connectionUpdates = updateConnectionRefs(scene.connections, old_name, new_name);
  }

  // Write back
  writeSceneToFile(scene, scene_path);

  const details: string[] = [
    `Renamed node "${old_name}" → "${new_name}" in ${path.basename(scene_path)}`,
  ];
  if (childUpdates > 0) details.push(`  Updated ${childUpdates} child node parent reference(s)`);
  if (connectionUpdates > 0) details.push(`  Updated ${connectionUpdates} connection reference(s)`);

  return details.join("\n");
}

function updateParentRefs(
  node: SceneNode,
  oldName: string,
  newName: string
): number {
  let count = 0;
  for (const child of node.children) {
    const childTyped = child as SceneNode;
    if (childTyped.parent) {
      if (childTyped.parent === oldName || childTyped.parent.startsWith(oldName + "/")) {
        childTyped.parent = childTyped.parent.replace(oldName, newName);
        count++;
      }
    }
    count += updateParentRefs(childTyped, oldName, newName);
  }
  return count;
}

function updateConnectionRefs(
  connections: Connection[],
  oldName: string,
  newName: string
): number {
  let count = 0;
  for (const conn of connections) {
    if (conn.from === oldName) { conn.from = newName; count++; }
    if (conn.to === oldName) { conn.to = newName; count++; }
  }
  return count;
}
