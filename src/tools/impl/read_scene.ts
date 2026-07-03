import { parseSceneFile } from "../../parsers/versioned-parser.js";
import * as fs from "fs";

export interface ReadSceneResult {
  success: boolean;
  scene?: {
    version: string;
    header: {
      format: number;
      loadSteps: number;
      uid?: string;
    };
    nodeCount: number;
    rootNode?: string;
    nodes: Array<{
      name: string;
      type: string;
      parent: string | null;
    }>;
  };
  error?: string;
}

export function readScene(scenePath: string): ReadSceneResult {
  try {
    // Validate file exists
    if (!fs.existsSync(scenePath)) {
      return {
        success: false,
        error: `Scene file not found: ${scenePath}`,
      };
    }

    // Validate file extension
    if (!scenePath.endsWith(".tscn")) {
      return {
        success: false,
        error: `File is not a .tscn scene file: ${scenePath}`,
      };
    }

    // Parse the scene file (auto-detects version)
    const parseResult = parseSceneFile(scenePath);
    const parsed = parseResult.scene;
    const version = parseResult.version;

    // Count nodes
    const nodeCount = countNodes(parsed.rootNode);

    // Build simplified node list
    const nodes: Array<{ name: string; type: string; parent: string | null }> = [];
    if (parsed.rootNode) {
      flattenNodes(parsed.rootNode, nodes);
    }

    const warnings = parseResult.warnings.length > 0 ? "\n" + parseResult.warnings.join("\n") : "";

    return {
      success: true,
      scene: {
        version,
        header: {
          format: parsed.header.format,
          loadSteps: parsed.header.loadSteps,
          uid: parsed.header.uid,
        },
        nodeCount,
        rootNode: parsed.rootNode?.name,
        nodes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function countNodes(node: { children: unknown[] } | null): number {
  if (!node) return 0;
  let count = 1; // Count current node
  for (const child of node.children) {
    count += countNodes(child as { children: unknown[] });
  }
  return count;
}

function flattenNodes(
  node: { name: string; type: string; parent: string | null; children: unknown[] },
  result: Array<{ name: string; type: string; parent: string | null }>
): void {
  result.push({
    name: node.name,
    type: node.type,
    parent: node.parent,
  });
  for (const child of node.children) {
    flattenNodes(child as { name: string; type: string; parent: string | null; children: unknown[] }, result);
  }
}
