// MCP Tool: read_project_settings — read project.godot configuration
import * as fs from "fs";
import * as path from "path";

export interface ReadProjectSettingsArgs {
  /** Path to the Godot project root */
  project_path: string;
}

/**
 * Read and parse project.godot configuration file.
 */
export function readProjectSettings(args: ReadProjectSettingsArgs): string {
  const { project_path } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const godotFile = path.join(project_path, "project.godot");
  if (!fs.existsSync(godotFile)) {
    throw new Error(`No project.godot found in: ${project_path}`);
  }

  const content = fs.readFileSync(godotFile, "utf-8");

  // Parse into sections
  const lines = content.split("\n");
  const sections: Array<{ name: string; entries: string[] }> = [];
  let current: { name: string; entries: string[] } | null = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1], entries: [] };
      sections.push(current);
    } else if (current && line.trim() && !line.startsWith(";")) {
      current.entries.push(line.trim());
    }
  }

  const result: string[] = [
    `Project Settings: ${path.basename(project_path)}`,
    `File: project.godot`,
    `Sections: ${sections.length}`,
    "",
  ];

  for (const section of sections) {
    result.push(`[${section.name}]`);
    for (const entry of section.entries) {
      result.push(`  ${entry}`);
    }
    result.push("");
  }

  result.push(`Total lines: ${lines.length}`);
  return result.join("\n");
}
