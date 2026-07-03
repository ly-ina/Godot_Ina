// MCP Tool: find_references — find where a resource or script is referenced
import { parseTscnFile } from "../../parsers/tscn-parser.js";
import { listScenes } from "./list_scenes.js";
import * as fs from "fs";

export interface FindReferencesArgs {
  /** Path to the Godot project root */
  project_path: string;
  /** Resource path to search for (res:// format or relative) */
  resource_path: string;
}

/**
 * Search for references to a specific resource across all scenes.
 */
export function findReferences(args: FindReferencesArgs): string {
  const { project_path, resource_path } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!resource_path) throw new Error("resource_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const scenes = listScenes(project_path);
  if (scenes.length === 0) return "No scene files found in project.";

  // Normalize the resource path for matching
  const searchPath = resource_path.replace(/\\/g, "/");
  const searchName = searchPath.split("/").pop() || searchPath;

  const references: Array<{ scene: string; type: string; details: string }> = [];

  for (const scene of scenes) {
    try {
      const parsed = parseTscnFile(scene.path);
      const sceneName = scene.path.replace(/^.*[\\/]/, "");

      // Check ext_resource references
      for (const res of parsed.extResources) {
        if (res.path.includes(searchName) || res.path.replace("res://", "").includes(searchPath)) {
          references.push({ scene: sceneName, type: "ext_resource", details: `path="${res.path}" type="${res.type}" id=${res.id}` });
        }
      }

      // Check script properties on nodes
      const nodes = flattenNode(parsed.rootNode);
      for (const node of nodes) {
        if (typeof node.properties?.script === "string" && node.properties.script.includes(searchName)) {
          references.push({ scene: sceneName, type: "script_attach", details: `node="${node.name}" script=${node.properties.script}` });
        }
      }
    } catch { /* skip */ }
  }

  if (references.length === 0) {
    return `No references found for "${resource_path}" in ${scenes.length} scene(s)`;
  }

  const lines: string[] = [
    `References for "${resource_path}":`,
    `Found ${references.length} reference(s) in project:`,
    "",
  ];

  for (const ref of references) {
    lines.push(`  [${ref.type}] ${ref.scene}`);
    lines.push(`    ${ref.details}`);
  }

  return lines.join("\n");
}

interface FlatNode {
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

function flattenNode(node: { name: string; type: string; properties: Record<string, unknown>; children: Array<{ name: string; type: string; properties: Record<string, unknown>; children: Array<unknown> }> } | null): FlatNode[] {
  if (!node) return [];
  const result: FlatNode[] = [{ name: node.name, type: node.type, properties: node.properties }];
  for (const child of node.children) {
    result.push(...flattenNode(child as { name: string; type: string; properties: Record<string, unknown>; children: Array<{ name: string; type: string; properties: Record<string, unknown>; children: Array<unknown> }> }));
  }
  return result;
}
