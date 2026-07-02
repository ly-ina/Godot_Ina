// Version-aware scene parser — auto-detects Godot 3.x vs 4.x
import * as fs from "fs";
import * as path from "path";
import { parseTscnFile as parseV4 } from "./tscn-parser.js";
import { V3_TO_V4 } from "../adapters/v3/mappings.js";
import type { ParsedScene, SceneNode } from "./tscn-types.js";

export interface ParseResult {
  scene: ParsedScene;
  version: "3.x" | "4.x";
  warnings: string[];
}

/**
 * Parse a .tscn file with auto-detection of Godot version.
 * For Godot 3.x files, node types are automatically translated to 4.x equivalents.
 */
export function parseSceneFile(scenePath: string, projectPath?: string): ParseResult {
  const warnings: string[] = [];

  // Detect version from the file
  const version = detectVersionFromScene(scenePath);
  const scene = parseV4(scenePath);

  if (version === "3.x" && scene.rootNode) {
    warnings.push("Detected Godot 3.x format — applying type translations");
    const count = translateNodeTree(scene.rootNode);
    warnings.push(`Translated ${count} node type(s) to Godot 4.x equivalents`);
  }

  return { scene, version, warnings };
}

export function detectVersionFromScene(scenePath: string): "3.x" | "4.x" {
  try {
    const content = fs.readFileSync(scenePath, "utf-8");
    const match = content.match(/format=(\d+)/);
    if (match) {
      const fmt = parseInt(match[1], 10);
      if (fmt === 2) return "3.x";
    }
  } catch { /* fall through */ }
  return "4.x";
}

function translateNodeTree(node: SceneNode): number {
  let count = 0;
  const v4Type = V3_TO_V4[node.type];
  if (v4Type) {
    node.type = v4Type;
    count++;
  }
  for (const child of node.children) {
    count += translateNodeTree(child);
  }
  return count;
}
