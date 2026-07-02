// MCP Tool: validate_project — validate a Godot project for structural integrity
import { findTscnFiles } from "./list_scenes.js";
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { validateScene } from "./validate_scene.js";
import * as fs from "fs";
import * as path from "path";

export interface ValidateProjectArgs {
  /** Path to the Godot project root */
  project_path: string;
}

/**
 * Validate an entire Godot project:
 * - Checks project.godot exists
 * - Validates all .tscn files
 * - Checks script references resolve
 */
export function validateProject(args: ValidateProjectArgs): string {
  const { project_path } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) {
    throw new Error(`Project path not found: ${project_path}`);
  }

  const lines: string[] = [
    `Project Validation: ${path.basename(project_path)}`,
    `Path: ${project_path}`,
    "",
  ];

  let totalErrors = 0;
  let totalWarnings = 0;

  // 1. Check project.godot
  const projectGodotPath = path.join(project_path, "project.godot");
  if (!fs.existsSync(projectGodotPath)) {
    lines.push("[ERROR] [project] project.godot not found — not a valid Godot project");
    totalErrors++;
  } else {
    lines.push("[OK] project.godot found");
  }

  // 2. Discover and validate all .tscn files
  let sceneFiles: string[];
  try {
    sceneFiles = findTscnFiles(project_path);
  } catch {
    lines.push("[ERROR] [scan] Failed to scan project directory");
    totalErrors++;
    lines.push("", `Summary: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
    return lines.join("\n");
  }

  lines.push(`\nScenes found: ${sceneFiles.length}`);

  for (const sceneFile of sceneFiles) {
    const result = validateScene({
      scene_path: sceneFile,
      project_path,
    });

    // Parse the result to extract error/warning counts
    const hasErrors = result.includes("[ERROR]");
    const hasWarnings = result.includes("[WARNING]");
    const isValid = !hasErrors;

    if (isValid && !hasWarnings) {
      lines.push(`  [OK] ${path.relative(project_path, sceneFile)}`);
    } else {
      const issues = result.split("\n").filter(l => l.startsWith("["));
      for (const issue of issues) {
        lines.push(`  ${issue}`);
        if (issue.startsWith("[ERROR]")) totalErrors++;
        if (issue.startsWith("[WARNING]")) totalWarnings++;
      }
    }
  }

  // 3. Check for orphaned .gd scripts (scripts not referenced by any scene)
  const allScripts = findGdFiles(project_path);
  const referencedScripts = new Set<string>();
  
  for (const sceneFile of sceneFiles) {
    try {
      const scene = parseTscnFile(sceneFile);
      for (const res of scene.extResources) {
        if (res.type === "Script") {
          referencedScripts.add(res.path.replace("res://", ""));
        }
      }
    } catch {
      // Scene already reported above
    }
  }

  const orphanedScripts = allScripts.filter(s => !referencedScripts.has(s));
  if (orphanedScripts.length > 0) {
    lines.push(`\n[WARNING] [reference] ${orphanedScripts.length} .gd file(s) not referenced by any scene:`);
    for (const s of orphanedScripts) {
      lines.push(`  - ${s}`);
    }
    totalWarnings += orphanedScripts.length;
  } else if (allScripts.length > 0) {
    lines.push(`\n[OK] All ${allScripts.length} .gd scripts are referenced by scenes`);
  }

  lines.push("", `Summary: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
  return lines.join("\n");
}

function findGdFiles(dirPath: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...findGdFiles(fullPath));
      } else if (entry.name.endsWith(".gd")) {
        results.push(entry.name);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return results;
}
