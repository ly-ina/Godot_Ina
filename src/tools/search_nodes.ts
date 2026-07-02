// MCP Tool: search_nodes — search for nodes across scene files
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { listScenes } from "./list_scenes.js";
import type { SceneInfo } from "./list_scenes.js";

export interface SearchNodesArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Node type filter (e.g. "CharacterBody2D", "Sprite2D") */
  node_type?: string;
  /** Node name substring match */
  name_contains?: string;
  /** Property name to search for */
  has_property?: string;
}

/**
 * Search for nodes across all scenes in a project.
 */
export function searchNodes(args: SearchNodesArgs): string {
  const { project_path, node_type, name_contains, has_property } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!node_type && !name_contains && !has_property) {
    throw new Error("At least one search filter required: node_type, name_contains, or has_property");
  }

  const scenes = listScenes(project_path);
  if (scenes.length === 0) return "No scene files found in project.";

  const results: Array<{ scene: string; node: string; type: string; properties: string }> = [];

  for (const scene of scenes) {
    try {
      const parsed = parseTscnFile(scene.path);
      const nodes = flattenNode(parsed.rootNode);
      for (const node of nodes) {
        // Apply filters
        if (node_type && node.type !== node_type) continue;
        if (name_contains && !node.name.toLowerCase().includes(name_contains.toLowerCase())) continue;
        if (has_property && !(has_property in node.properties)) continue;

        const sceneName = scene.path.replace(/^.*[\\/]/, "");
        const props = Object.keys(node.properties);
        results.push({
          scene: sceneName,
          node: node.name,
          type: node.type,
          properties: props.length > 0 ? props.slice(0, 5).join(", ") + (props.length > 5 ? "..." : "") : "(none)",
        });
      }
    } catch { /* skip unparseable scenes */ }
  }

  if (results.length === 0) {
    const filters = [node_type && `type=${node_type}`, name_contains && `name~${name_contains}`, has_property && `prop=${has_property}`].filter(Boolean).join(", ");
    return `No matching nodes found (${filters})`;
  }

  // Group by scene
  const grouped = new Map<string, typeof results>();
  for (const r of results) {
    const g = grouped.get(r.scene) || [];
    g.push(r);
    grouped.set(r.scene, g);
  }

  const lines: string[] = [
    `Found ${results.length} node(s) across ${grouped.size} scene(s):`,
    "",
  ];

  for (const [scene, nodes] of grouped) {
    lines.push(`  ${scene} (${nodes.length}):`);
    for (const n of nodes) {
      lines.push(`    - ${n.node} (${n.type}) [${n.properties}]`);
    }
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
