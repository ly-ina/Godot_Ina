// MCP Tool: edit_project_settings — modify project.godot configuration
import * as fs from "fs";
import * as path from "path";

export interface EditProjectSettingsArgs {
  /** Path to the Godot project root */
  project_path: string;
  /** Section key (e.g. "application", "rendering", "input") */
  section: string;
  /** Setting key (e.g. "config/name", "window/size/viewport_width") */
  key: string;
  /** Value to set */
  value: string;
  /** Type hint (optional): string, int, float, bool */
  type?: "string" | "int" | "float" | "bool";
}

/**
 * Modify a setting in project.godot.
 * Creates the section and key if they don't exist.
 * Creates a .bak backup before modifying.
 */
export function editProjectSettings(args: EditProjectSettingsArgs): string {
  const { project_path, section, key, value, type } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!section) throw new Error("section is required");
  if (!key) throw new Error("key is required");
  if (value === undefined || value === null) throw new Error("value is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const godotFile = path.join(project_path, "project.godot");
  if (!fs.existsSync(godotFile)) {
    throw new Error(`No project.godot found in: ${project_path}`);
  }

  // Create backup
  const bakFile = godotFile + ".bak";
  fs.copyFileSync(godotFile, bakFile);

  // Read and parse
  const content = fs.readFileSync(godotFile, "utf-8");
  const lines = content.split("\n");

  // Format the value with type hint
  const formattedValue = formatValue(value, type);

  // Find or create the section
  const sectionHeader = `[${section}]`;
  let sectionIndex = -1;
  let nextSectionIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === sectionHeader) {
      sectionIndex = i;
    } else if (sectionIndex !== -1 && trimmed.startsWith("[") && trimmed.endsWith("]")) {
      nextSectionIndex = i;
      break;
    }
  }

  // Look for existing key in section
  let keyFound = false;
  if (sectionIndex !== -1) {
    const start = sectionIndex + 1;
    const end = nextSectionIndex !== -1 ? nextSectionIndex : lines.length;
    for (let i = start; i < end; i++) {
      if (lines[i].trim().startsWith(key + "=")) {
        lines[i] = `${key}="${formattedValue}"`;
        keyFound = true;
        break;
      }
    }
  }

  if (!keyFound) {
    // Need to add the key
    if (sectionIndex === -1) {
      // Create new section at the end
      if (lines[lines.length - 1] !== "") {
        lines.push("");
      }
      lines.push(sectionHeader);
      lines.push(`${key}="${formattedValue}"`);
    } else {
      // Insert after section header
      const insertAt = sectionIndex + 1;
      // Skip empty lines
      let insertPos = insertAt;
      while (insertPos < lines.length && lines[insertPos].trim() === "") {
        insertPos++;
      }
      lines.splice(insertPos, 0, `${key}="${formattedValue}"`);
    }
  }

  // Write back
  fs.writeFileSync(godotFile, lines.join("\n"), "utf-8");

  return `Updated project.godot\n  [${section}] ${key} = ${formattedValue}\nBackup saved to: ${path.basename(bakFile)}`;
}

function formatValue(value: string, type?: "string" | "int" | "float" | "bool"): string {
  if (type === "bool") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return "true";
    return "false";
  }
  if (type === "int") return String(parseInt(value, 10));
  if (type === "float") return String(parseFloat(value));
  // Default: string, return as-is (already quoted by the writer)
  return value;
}
