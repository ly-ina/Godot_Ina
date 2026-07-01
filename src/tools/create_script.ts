// MCP Tool: create_script — create a .gd GDScript file, optionally attach to a scene node
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { findNodeInTree } from "../utils/tree-utils.js";
import * as fs from "fs";
import * as path from "path";

export interface CreateScriptArgs {
  /** Path to save the .gd script file */
  script_path: string;
  /** GDScript content */
  content: string;
  /** Optional: Path to .tscn scene to attach the script to a node */
  scene_path?: string;
  /** Optional: Name of the node to attach the script to (requires scene_path) */
  node_name?: string;
}

/**
 * Create a GDScript file, optionally attaching it to a scene node
 */
export function createScript(args: CreateScriptArgs): string {
  const { script_path, content, scene_path, node_name } = args;

  // Validate inputs
  if (!script_path) {
    throw new Error("script_path is required");
  }
  if (!script_path.endsWith(".gd")) {
    throw new Error("script_path must end with .gd");
  }
  if (!content) {
    throw new Error("content is required — GDScript code to write");
  }

  // Resolve absolute path
  const absPath = path.isAbsolute(script_path)
    ? script_path
    : path.resolve(process.cwd(), script_path);

  // Check if file already exists
  if (fs.existsSync(absPath)) {
    throw new Error(`Script file already exists: ${absPath}`);
  }

  // Ensure directory exists
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write script file
  fs.writeFileSync(absPath, content, "utf-8");

  const resultParts: string[] = [
    `Created script: ${absPath}`,
    `Lines: ${content.split("\n").length}`,
  ];

  // Optionally attach to a scene node
  if (scene_path && node_name) {
    if (!scene_path.endsWith(".tscn")) {
      throw new Error("scene_path must end with .tscn");
    }
    if (!fs.existsSync(scene_path)) {
      throw new Error(`Scene file not found: ${scene_path}`);
    }

    // Parse scene
    const scene = parseTscnFile(scene_path);
    if (!scene.rootNode) {
      throw new Error("Scene has no root node");
    }

    // Find the node
    const node = findNodeInTree(scene.rootNode, node_name);
    if (!node) {
      throw new Error(
        `Node "${node_name}" not found in scene. The script was created but not attached.`
      );
    }

    // Compute resource path (relative from project root)
    // Godot uses "res://" paths, so we need a relative path from project root
    const projectRoot = findProjectRoot(scene_path);
    let resPath: string;
    if (projectRoot) {
      const relative = path.relative(projectRoot, absPath).replace(/\\/g, "/");
      resPath = `res://${relative}`;
    } else {
      // Fallback: use scene file's directory as root
      const sceneDir = path.dirname(scene_path);
      const relative = path.relative(sceneDir, absPath).replace(/\\/g, "/");
      resPath = `res://${relative}`;
    }

    // Add ext_resource for the script and set script property on node
    const extResId = `${scene.extResources.length + 1}_`;
    scene.extResources.push({
      id: extResId,
      type: "Script",
      path: resPath,
    });
    node.properties["script"] = `ExtResource("${extResId}")`;

    // Update load_steps
    scene.header.loadSteps = Math.max(
      scene.header.loadSteps,
      scene.extResources.length + scene.subResources.length + 2
    );

    // Write back
    writeSceneToFile(scene, scene_path);

    resultParts.push(`Attached to node "${node_name}" in ${path.basename(scene_path)}`);
    resultParts.push(`Resource path: ${resPath}`);
  } else if (scene_path && !node_name) {
    resultParts.push("Note: node_name not provided — script was not attached to any node");
  }

  return resultParts.join("\n");
}

/**
 * Try to find the Godot project root by looking for project.godot
 */
function findProjectRoot(scenePath: string): string | null {
  const dir = path.dirname(scenePath);
  if (fs.existsSync(path.join(dir, "project.godot"))) {
    return dir;
  }
  // Check parent directory
  const parent = path.dirname(dir);
  if (parent !== dir && fs.existsSync(path.join(parent, "project.godot"))) {
    return parent;
  }
  return null;
}
