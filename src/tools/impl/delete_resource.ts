// MCP Tool: delete_resource — delete a resource file with reference checking
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseTscnFile } from "../../parsers/tscn-parser.js";
import { findTscnFiles } from "./list_scenes.js";

export interface DeleteResourceArgs {
  /** Path to the resource file in the project */
  resource_path: string;
  /** Path to the Godot project root (required for reference check) */
  project_path: string;
  /** Skip reference checking and force delete (default: false) */
  force?: boolean;
  /** Move to trash instead of permanent delete (default: true) */
  use_trash?: boolean;
}

/**
 * Delete a resource file with safety: checks if any scene references it.
 */
export function deleteResource(args: DeleteResourceArgs): string {
  const { resource_path, project_path, force = false, use_trash = true } = args;

  if (!resource_path) throw new Error("resource_path is required");
  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(resource_path)) throw new Error(`Resource not found: ${resource_path}`);
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  // Check for references in scenes
  if (!force) {
    const scenes = findTscnFiles(project_path);
    const resName = path.basename(resource_path);
    const referencingScenes: string[] = [];

    for (const scenePath of scenes) {
      try {
        const scene = parseTscnFile(scenePath);
        for (const res of scene.extResources) {
          if (res.path.includes(resName)) {
            referencingScenes.push(`${path.relative(project_path, scenePath)} (${res.type})`);
          }
        }
      } catch { /* skip unparseable scenes */ }
    }

    if (referencingScenes.length > 0) {
      throw new Error(
        `Cannot delete: "${resName}" is referenced by ${referencingScenes.length} scene(s):\n` +
        referencingScenes.map(s => `  - ${s}`).join("\n") +
        "\nUse force: true to delete anyway."
      );
    }
  }

  // Perform deletion
  if (use_trash) {
    const trashDir = path.join(os.tmpdir(), "godot-mcp-trash");
    if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
    const trashPath = path.join(trashDir, `${path.basename(resource_path)}.${Date.now()}.bak`);
    fs.copyFileSync(resource_path, trashPath);
    fs.unlinkSync(resource_path);
    return `Deleted "${path.basename(resource_path)}" (moved to trash)\nBackup: ${trashPath}`;
  } else {
    fs.unlinkSync(resource_path);
    return `Permanently deleted "${path.basename(resource_path)}"`;
  }
}
