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

  // 4. Validate ext_resource references
  if (project_path && scene.extResources.length > 0) {
    for (const res of scene.extResources) {
      // Resolve resource path relative to project
      const resPath = path.resolve(project_path, res.path.replace("res://", ""));
      if (!fs.existsSync(resPath)) {
        issues.push({
          severity: "error",
          category: "reference",
          message: `ExtResource(${res.id}) type="${res.type}" path="${res.path}" → file not found`,
        });
      }
    }
  }

  // 5. Check for duplicate node names
  const names = collectNodeNames(scene.rootNode!);
  const nameCounts = new Map<string, number>();
  for (const name of names) {
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) {
      issues.push({
        severity: "warning",
        category: "structure",
        message: `Duplicate node name: "${name}" appears ${count} times`,
      });
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

  return formatResult(scene_path, issues);
}

function collectNodeNames(node: { name: string; children: Array<{ name: string; children: Array<unknown> }> }): string[] {
  const names: string[] = [node.name];
  for (const child of node.children) {
    names.push(...collectNodeNames(child as { name: string; children: Array<{ name: string; children: Array<unknown> }> }));
  }
  return names;
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
      const icon = issue.severity === "error" ? "!!" : "!!";
      lines.push(`[${issue.severity.toUpperCase()}] [${issue.category}] ${issue.message}`);
    }
  }

  return lines.join("\n");
}
