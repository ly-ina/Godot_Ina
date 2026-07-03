// Consolidated scene editor. CRUD operations on scenes and nodes.
import { createScene } from "./impl/create_scene.js";
import { readScene } from "./impl/read_scene.js";
import { listScenes } from "./impl/list_scenes.js";
import { addNode } from "./impl/add_node.js";
import { editNode } from "./impl/edit_node.js";
import { deleteNode } from "./impl/delete_node.js";
import { renameNode } from "./impl/rename_node.js";
import { validateScene } from "./validate_scene.js";

export interface EditSceneArgs {
  /** Operation: list | read | create | add_node | edit_node | delete_node | rename_node | validate */
  action: "list" | "read" | "create" | "add_node" | "edit_node" | "delete_node" | "rename_node" | "validate";
  /** Path to Godot project root */
  project_path?: string;
  /** Path to scene file (relative to project root, e.g. scenes/World.tscn) */
  scene_path?: string;
  /** Scene name (for create) */
  scene_name?: string;
  /** Root node type (for create, default: Node2D) */
  scene_type?: string;
  /** Node name (for add/delete/rename) */
  node_name?: string;
  /** Node type (for add_node) */
  node_type?: string;
  /** Parent node path (for add_node) */
  parent_path?: string;
  /** New name for rename */
  new_name?: string;
  /** Properties (JSON string) for edit_node */
  properties?: string;
}

/**
 * One tool for all scene/node operations. Previously 8 separate tools.
 * Use action parameter to pick the operation.
 */
export function editScene(args: EditSceneArgs): string {
  const { action, project_path, scene_path, scene_name, scene_type, node_name, node_type, parent_path, new_name, properties } = args;

  switch (action) {
    case "list": {
      if (!project_path) throw new Error("project_path required for list");
      return listScenes(project_path).map(s => `${s.path}`).join("\n");
    }

    case "read": {
      if (!scene_path) throw new Error("scene_path required for read");
      const result = readScene(scene_path);
      return typeof result === "string" ? result : JSON.stringify(result, null, 2);
    }

    case "create": {
      if (!scene_path || !scene_name) throw new Error("scene_path and scene_name required for create");
      createScene({ scene_path, root_node_name: scene_name, root_node_type: scene_type || "Node2D", project_path: project_path || "" });
      return `Scene created: ${scene_path}`;
    }

    case "add_node": {
      if (!scene_path || !node_name || !node_type) throw new Error("scene_path, node_name, node_type required for add_node");
      addNode({ scene_path, parent_node_name: parent_path || ".", node_type, node_name });
      return `Node ${node_name} added to ${scene_path}`;
    }

    case "edit_node": {
      if (!scene_path || !node_name) throw new Error("scene_path and node_name required for edit_node");
      const parsedProps = properties ? JSON.parse(properties) : {};
      editNode({ scene_path, node_name, properties: parsedProps } as any);
      return `Node ${node_name} edited in ${scene_path}`;
    }

    case "delete_node": {
      if (!scene_path || !node_name) throw new Error("scene_path and node_name required for delete_node");
      deleteNode({ scene_path, node_name } as any);
      return `Node ${node_name} deleted from ${scene_path}`;
    }

    case "rename_node": {
      if (!scene_path || !node_name || !new_name) throw new Error("scene_path, node_name, new_name required for rename_node");
      renameNode({ scene_path, node_name, new_node_name: new_name } as any);
      return `Node ${node_name} renamed to ${new_name} in ${scene_path}`;
    }

    case "validate": {
      if (!scene_path) throw new Error("scene_path required for validate");
      return validateScene({ scene_path } as any);
    }

    default:
      throw new Error(`Unknown edit_scene action: ${action}`);
  }
}
