// Adapter factory — auto-detect engine version and return appropriate adapter
import type { GodotAdapter, GodotVersion } from "./types.js";
import { v4Adapter } from "./v4/adapter.js";
import { v3Adapter } from "./v3/adapter.js";
import * as fs from "fs";
import * as path from "path";

const adapters: Record<string, GodotAdapter> = {
  "4.x": v4Adapter,
  "3.x": v3Adapter,
};

export { v4Adapter, v3Adapter };

/**
 * Get adapter for a specific Godot version
 */
export function getAdapter(version: GodotVersion): GodotAdapter {
  const adapter = adapters[version];
  if (!adapter) {
    throw new Error(`Unsupported Godot version: ${version}`);
  }
  return adapter;
}

/**
 * Auto-detect Godot version from a .tscn file by reading its format field.
 * Returns "4.x" for format=3, "3.x" for format=2/3 or format=2.
 */
export function detectVersionFromScene(scenePath: string): GodotVersion {
  if (!fs.existsSync(scenePath)) {
    return "4.x"; // Default to 4.x
  }

  try {
    const content = fs.readFileSync(scenePath, "utf-8");
    const formatMatch = content.match(/format=(\d+)/);
    if (formatMatch) {
      const format = parseInt(formatMatch[1], 10);
      if (format === 2) return "3.x";
    }
    return "4.x"; // format=3 or unknown → default to 4.x
  } catch {
    return "4.x";
  }
}

/**
 * Auto-detect Godot version from a project by scanning .tscn files.
 */
export function detectVersionFromProject(projectPath: string): GodotVersion {
  if (!fs.existsSync(projectPath)) return "4.x";

  // Check project.godot first
  const projectFile = path.join(projectPath, "project.godot");
  if (fs.existsSync(projectFile)) {
    try {
      const content = fs.readFileSync(projectFile, "utf-8");
      if (content.includes("config_version=4") || content.includes("config_version=5")) {
        return "4.x";
      }
      if (content.includes("config_version=3") || content.includes("config_version=2")) {
        return "3.x";
      }
    } catch { /* fall through */ }
  }

  // Scan first .tscn file for format field
  try {
    const entries = fs.readdirSync(projectPath);
    for (const entry of entries) {
      if (entry.endsWith(".tscn")) {
        return detectVersionFromScene(path.join(projectPath, entry));
      }
    }
  } catch { /* fall through */ }

  return "4.x"; // Default
}
