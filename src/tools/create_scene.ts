// MCP Tool: create_scene
import { createEmptyScene, writeSceneToFile } from "../writers/tscn-writer.js";
import * as fs from "fs";
import * as path from "path";

export interface CreateSceneArgs {
  /** Path to save the scene (relative to project root or absolute) */
  scene_path: string;
  /** Root node name */
  root_node_name: string;
  /** Root node type (e.g., "Node2D", "Node3D", "CharacterBody2D") */
  root_node_type: string;
  /** Optional: Godot project root path (defaults to current directory) */
  project_path?: string;
}

/**
 * Create a new .tscn scene file
 */
export function createScene(args: CreateSceneArgs): string {
  const { scene_path, root_node_name, root_node_type, project_path } = args;

  // Validate inputs
  if (!scene_path || !scene_path.endsWith(".tscn")) {
    throw new Error("scene_path must end with .tscn");
  }

  if (!root_node_name || !root_node_type) {
    throw new Error("root_node_name and root_node_type are required");
  }

  // Resolve file path
  let filePath: string;
  if (path.isAbsolute(scene_path)) {
    filePath = scene_path;
  } else {
    const basePath = project_path || process.cwd();
    filePath = path.resolve(basePath, scene_path);
  }

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    throw new Error(`Scene file already exists: ${filePath}`);
  }

  // Create empty scene
  const scene = createEmptyScene(root_node_name, root_node_type);

  // Write to file
  writeSceneToFile(scene, filePath);

  return `Created scene: ${filePath}\nRoot node: ${root_node_name} (${root_node_type})\nFormat: ${scene.header.format}`;
}

/**
 * Validate if the created scene file is valid
 */
export function validateCreatedScene(scenePath: string): boolean {
  if (!fs.existsSync(scenePath)) {
    return false;
  }

  const content = fs.readFileSync(scenePath, "utf-8");

  // Basic validation: check for required blocks
  return (
    content.includes("[gd_scene") &&
    content.includes("format=") &&
    content.includes("[node name=")
  );
}
