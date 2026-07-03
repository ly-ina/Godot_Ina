// MCP Tool: analyze_deps — analyze cross-file dependencies
// Fills the gap: find which scenes/scripts reference a given resource.
import * as fs from "fs";
import * as path from "path";
import { parseTscnFile } from "../parsers/tscn-parser.js";

export interface AnalyzeDepsArgs {
  project_path: string;
  /** Resource path to find references for (e.g. res://assets/player.png, res://scripts/player.gd) */
  resource_path?: string;
  /** Mode: "find_refs" (find what references a resource) or "deps_of" (find what a scene depends on) */
  mode?: "find_refs" | "deps_of";
  /** Scene path to analyze (for deps_of mode) */
  scene_path?: string;
}

export function analyzeDeps(args: AnalyzeDepsArgs): string {
  const { project_path, resource_path, mode = "find_refs", scene_path } = args;
  if (!project_path) throw new Error("project_path is required");

  const lines: string[] = [];
  let total = 0;

  if (mode === "find_refs") {
    if (!resource_path) throw new Error("resource_path required for find_refs mode");
    const targetPath = resource_path.replace("res://", "").replace(/\\/g, "/");
    lines.push(`References to "${resource_path}":`);

    // Scan all .tscn files
    const sceneFiles = findFiles(project_path, ".tscn");
    for (const sceneFile of sceneFiles) {
      try {
        const scene = parseTscnFile(sceneFile);
        for (const res of scene.extResources) {
          if (res.path.replace(/\\/g, "/") === targetPath) {
            const rel = path.relative(project_path, sceneFile).replace(/\\/g, "/");
            lines.push(`  ${rel}  (as ${res.type}, id=${res.id})`);
            total++;
          }
        }
        // Also check script = ExtResource("X") in node properties
        if (scene.rootNode) {
          const allNodes = flattenSceneNodes(scene.rootNode);
          for (const node of allNodes) {
            for (const [, val] of Object.entries(node.properties)) {
              if (typeof val === "string" && val.startsWith("ExtResource(")) {
                const idMatch = val.match(/ExtResource\("([^"]+)"\)/);
                if (idMatch) {
                  const extRes = scene.extResources.find(r => r.id === idMatch[1]);
                  if (extRes && extRes.path.replace(/\\/g, "/") === targetPath) {
                    const rel = path.relative(project_path, sceneFile).replace(/\\/g, "/");
                    if (!lines.some(l => l.includes(rel) && l.includes(node.name))) {
                      lines.push(`  ${rel} → node "${node.name}"`);
                      total++;
                    }
                  }
                }
              }
            }
          }
        }
      } catch {
        // Skip unparseable files
      }
    }

    // Scan .gd files for res:// references
    const gdFiles = findFiles(project_path, ".gd");
    for (const gdFile of gdFiles) {
      try {
        const content = fs.readFileSync(gdFile, "utf-8");
        if (content.includes(targetPath) || content.includes(resource_path)) {
          const rel = path.relative(project_path, gdFile).replace(/\\/g, "/");
          lines.push(`  ${rel}  (script references)`);
          total++;
        }
      } catch { /* skip */ }
    }

    if (total === 0) lines.push("  (no references found)");
    lines.push("", `Total: ${total} reference(s)`);
  } else if (mode === "deps_of") {
    if (!scene_path) throw new Error("scene_path required for deps_of mode");
    if (!fs.existsSync(scene_path)) throw new Error(`Scene not found: ${scene_path}`);

    const scene = parseTscnFile(scene_path);
    const rel = path.relative(project_path, scene_path).replace(/\\/g, "/");
    lines.push(`Dependencies of "${rel}":`);

    for (const res of scene.extResources) {
      lines.push(`  ${res.path}  (${res.type})`);
      total++;
    }
    if (total === 0) lines.push("  (no external dependencies)");
    lines.push("", `Total: ${total} external resource(s)`);
  }

  return lines.join("\n");
}

function findFiles(dir: string, ext: string): string[] {
  const result: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...findFiles(fullPath, ext));
      } else if (entry.name.endsWith(ext)) {
        result.push(fullPath);
      }
    }
  } catch { /* skip */ }
  return result;
}

function flattenSceneNodes(node: { name: string; properties: Record<string, unknown>; children: Array<unknown> }): Array<{ name: string; properties: Record<string, unknown> }> {
  const result: Array<{ name: string; properties: Record<string, unknown> }> = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenSceneNodes(child as { name: string; properties: Record<string, unknown>; children: Array<unknown> }));
    }
  }
  return result;
}
