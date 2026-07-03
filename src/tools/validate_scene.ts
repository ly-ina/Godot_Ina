// MCP Tool: validate_scene — validate a .tscn scene file for integrity
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { findNodeInTree } from "../utils/tree-utils.js";
import * as fs from "fs";
import * as path from "path";

export interface ValidateSceneArgs {
  /** Path to the .tscn scene file to validate */
  scene_path: string;
  /** Optional project root — enables reference resolution checks */
  project_path?: string;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  category: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: string;
}

/**
 * Validate a .tscn scene file for structural and referential integrity.
 */
export function validateScene(args: ValidateSceneArgs): string {
  const { scene_path, project_path } = args;

  // Input validation
  if (!scene_path) throw new Error("scene_path is required");
  if (!scene_path.endsWith(".tscn")) throw new Error("scene_path must end with .tscn");

  // File existence
  if (!fs.existsSync(scene_path)) {
    throw new Error(`Scene file not found: ${scene_path}`);
  }

  const issues: ValidationIssue[] = [];

  // 1. Parse the scene — catches format errors
  let scene;
  try {
    scene = parseTscnFile(scene_path);
  } catch (e: unknown) {
    issues.push({
      severity: "error",
      category: "parse",
      message: `Failed to parse scene: ${e instanceof Error ? e.message : String(e)}`,
    });
    return formatResult(scene_path, issues);
  }

  // 2. Check root node
  if (!scene.rootNode) {
    issues.push({
      severity: "error",
      category: "structure",
      message: "Scene has no root node",
    });
  }

  // 3. Check header
  if (!scene.header.format) {
    issues.push({
      severity: "error",
      category: "header",
      message: "Missing format declaration in header",
    });
  } else if (scene.header.format !== 3) {
    issues.push({
      severity: "warning",
      category: "compatibility",
      message: `Format ${scene.header.format} — this parser targets format 3 (Godot 4.x)`,
    });
  }

  // 4. Validate ext_resource references (existing check, enhanced with more detail)
  const extResourceMap = new Map<string, { type: string; path: string }>();
  for (const res of scene.extResources) {
    extResourceMap.set(res.id, res);
    if (project_path) {
      const resPath = path.resolve(project_path, res.path.replace("res://", ""));
      if (!fs.existsSync(resPath)) {
        issues.push({
          severity: "error",
          category: "reference",
          message: `ExtResource(${res.id}) type="${res.type}" path="${res.path}" → 文件不存在：${resPath}`,
        });
      }
    }
  }

  // 5. Check for duplicate node names
  if (scene.rootNode) {
    const names = collectNodeNames(scene.rootNode);
    const nameCounts = new Map<string, number>();
    for (const name of names) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    for (const [name, count] of nameCounts) {
      if (count > 1) {
        issues.push({
          severity: "warning",
          category: "structure",
          message: `重复节点名称: "${name}" 出现 ${count} 次`,
        });
      }
    }
  }

  // 6. Validate connection references
  for (const conn of scene.connections) {
    if (scene.rootNode) {
      if (conn.from !== "." && !findNodeInTree(scene.rootNode, conn.from)) {
        issues.push({
          severity: "error",
          category: "reference",
          message: `Connection signal="${conn.signal}" references non-existent source node: "${conn.from}"`,
        });
      }
      if (conn.to !== "." && !findNodeInTree(scene.rootNode, conn.to)) {
        issues.push({
          severity: "error",
          category: "reference",
          message: `Connection signal="${conn.signal}" references non-existent target node: "${conn.to}"`,
        });
      }
    }
  }

  // ── NEW: Enhanced reference detection ──

  // 7. Check that SubResource references in node properties exist
  const subResourceIds = new Set(scene.subResources.map(sr => sr.id));
  if (scene.rootNode) {
    const allNodes = flattenNodes(scene.rootNode);
    for (const node of allNodes) {
      for (const [propKey, propVal] of Object.entries(node.properties)) {
        const valStr = String(propVal);

        // Check SubResource references
        const subRefs = valStr.match(/SubResource\("([^"]+)"\)/g);
        if (subRefs) {
          for (const ref of subRefs) {
            const idMatch = ref.match(/SubResource\("([^"]+)"\)/);
            if (idMatch) {
              const refId = idMatch[1];
              if (!subResourceIds.has(refId)) {
                issues.push({
                  severity: "error",
                  category: "reference",
                  message: `节点 "${node.name}" 的 ${propKey} 引用了不存在的 SubResource("${refId}")。场景中定义的 SubResource: [${Array.from(subResourceIds).join(", ")}]`,
                });
              }
            }
          }
        }

        // Check ExtResource references in node properties
        const extRefs = valStr.match(/ExtResource\("([^"]+)"\)/g);
        if (extRefs) {
          for (const ref of extRefs) {
            const idMatch = ref.match(/ExtResource\("([^"]+)"\)/);
            if (idMatch) {
              const refId = idMatch[1];
              if (!extResourceMap.has(refId)) {
                issues.push({
                  severity: "error",
                  category: "reference",
                  message: `节点 "${node.name}" 的 ${propKey} 引用了不存在的 ExtResource("${refId}")。场景中定义的 ExtResource: [${Array.from(extResourceMap.keys()).join(", ")}]`,
                });
              }
            }
          }
        }

        // Check script = null (explicitly no script — valid, not an issue)
        // Check texture = null (valid for Sprite2D without texture)
      }
    }
  }

  // 8. Check parent paths resolve to existing nodes
  if (scene.rootNode) {
    const nodeNames = new Set<string>();
    const allNodes = flattenNodes(scene.rootNode);
    for (const n of allNodes) {
      nodeNames.add(n.name);
    }
    // Also check raw nodes from parser (children might be missing due to broken parent)
    const rawContent = fs.readFileSync(scene_path, "utf-8");
    const parentRefs = rawContent.match(/parent="([^"]+)"/g) || [];
    for (const ref of parentRefs) {
      const parentName = ref.match(/parent="([^"]+)"/)?.[1];
      if (parentName && parentName !== ".") {
        // Resolve path segments (e.g. "Ground/Collision" → check "Ground" exists)
        const parentSegments = parentName.split("/");
        const topParent = parentSegments[0];
        if (!nodeNames.has(topParent)) {
          issues.push({
            severity: "warning",
            category: "structure",
            message: `父节点路径 "${parentName}" 中的 "${topParent}" 在节点列表中不存在，可能导致子节点平铺`,
          });
        }
      }
    }
  }

  // 9. Detect potential "vanished" warnings - nodes that may have lost their parent
  if (scene.rootNode) {
    const allNodes = flattenNodes(scene.rootNode);
    for (const node of allNodes) {
      // Check if node has a script that might fail to load
      const scriptVal = node.properties["script"];
      if (scriptVal && typeof scriptVal === "string" && scriptVal.startsWith("ExtResource(")) {
        const idMatch = scriptVal.match(/ExtResource\("([^"]+)"\)/);
        if (idMatch) {
          const scriptId = idMatch[1];
          const extRes = extResourceMap.get(scriptId);
          if (extRes && extRes.type !== "Script") {
            issues.push({
              severity: "warning",
              category: "reference",
              message: `节点 "${node.name}" 的 script 引用了 ExtResource("${scriptId}") 类型="${extRes.type}"，应为 Script 类型`,
            });
          }
          if (extRes && project_path) {
            const scriptPath = path.resolve(project_path, extRes.path.replace("res://", ""));
            if (fs.existsSync(scriptPath)) {
              // Check if file is empty
              const stat = fs.statSync(scriptPath);
              if (stat.size === 0) {
                issues.push({
                  severity: "error",
                  category: "reference",
                  message: `节点 "${node.name}" 引用的脚本 ${extRes.path} 是空文件（0 字节）`,
                });
              }
            }
          }
        }
      }
    }
  }

  return formatResult(scene_path, issues);
}

function collectNodeNames(node: FlatNode): string[] {
  const names: string[] = [node.name];
  if (node.children) {
    for (const child of node.children) {
      names.push(...collectNodeNames(child as FlatNode));
    }
  }
  return names;
}

/** Flatten a node tree into a flat array */
interface FlatNode {
  name: string;
  properties: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any[];
}

function flattenNodes(node: FlatNode): FlatNode[] {
  const result: FlatNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenNodes(child as FlatNode));
    }
  }
  return result;
}

function formatResult(scenePath: string, issues: ValidationIssue[]): string {
  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");
  const valid = errors.length === 0;

  const lines: string[] = [
    `Validation: ${path.basename(scenePath)}`,
    `Status: ${valid ? "PASS" : "FAIL"}`,
    `Errors: ${errors.length}, Warnings: ${warnings.length}`,
    "",
  ];

  if (issues.length === 0) {
    lines.push("No issues found.");
  } else {
    for (const issue of issues) {
      lines.push(`[${issue.severity.toUpperCase()}] [${issue.category}] ${issue.message}`);
    }
  }

  return lines.join("\n");
}
