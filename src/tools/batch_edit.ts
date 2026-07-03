// MCP Tool: batch_edit — batch operations across multiple files
// Fills the gap: single-file edit_script is fine for one-off changes,
// but renaming a node type across 20 scenes needs a batch tool.
import * as fs from "fs";
import * as path from "path";
import { parseTscnFile } from "../parsers/tscn-parser.js";

export interface BatchEditArgs {
  project_path: string;
  /** Operation type */
  action: "replace_text" | "replace_node_type" | "add_property" | "list_files";
  /** File pattern (glob-like, default: **\/*.gd) */
  glob?: string;
  /** Search pattern (for replace_text) */
  pattern?: string;
  /** Replacement text (for replace_text) */
  replacement?: string;
  /** Old node type (for replace_node_type) */
  old_type?: string;
  /** New node type (for replace_node_type) */
  new_type?: string;
  /** Property name (for add_property) */
  property?: string;
  /** Property value (for add_property) */
  value?: string;
  /** Preview only — don't actually modify */
  dry_run?: boolean;
}

export function batchEdit(args: BatchEditArgs): string {
  const { project_path, action, glob = "**/*.gd", dry_run } = args;
  if (!project_path) throw new Error("project_path is required");

  const files = collectFiles(project_path, glob);
  if (files.length === 0) return `No files matched: ${glob}`;

  const lines: string[] = [];
  let modified = 0;
  let skipped = 0;

  switch (action) {
    case "list_files":
      lines.push(`Files matching "${glob}": ${files.length}`);
      for (const f of files) {
        lines.push(`  ${path.relative(project_path, f).replace(/\\/g, "/")}`);
      }
      return lines.join("\n");

    case "replace_text": {
      const { pattern, replacement } = args;
      if (!pattern) throw new Error("pattern required for replace_text");
      if (replacement === undefined) throw new Error("replacement required for replace_text");

      lines.push(`Replace "${pattern}" → "${replacement}" in ${files.length} file(s)`);
      if (dry_run) lines.push("  (DRY RUN — no changes made)");

      for (const file of files) {
        const ext = path.extname(file);
        let content: string;
        try {
          content = fs.readFileSync(file, "utf-8");
        } catch { skipped++; continue; }
        if (!content.includes(pattern)) { skipped++; continue; }
        const newContent = content.split(pattern).join(replacement);
        if (!dry_run) fs.writeFileSync(file, newContent, "utf-8");
        const rel = path.relative(project_path, file).replace(/\\/g, "/");
        lines.push(`  ${dry_run ? "[WOULD] " : "[OK] "} ${rel}`);
        modified++;
      }
      lines.push("", `Modified: ${modified}, Skipped: ${skipped}${dry_run ? " (dry run)" : ""}`);
      return lines.join("\n");
    }

    case "replace_node_type": {
      const { old_type, new_type } = args;
      if (!old_type) throw new Error("old_type required for replace_node_type");
      if (!new_type) throw new Error("new_type required for replace_node_type");

      const sceneFiles = files.filter(f => f.endsWith(".tscn"));
      lines.push(`Replace node type "${old_type}" → "${new_type}" in ${sceneFiles.length} scene(s)`);
      if (dry_run) lines.push("  (DRY RUN — no changes made)");

      for (const file of sceneFiles) {
        try {
          const content = fs.readFileSync(file, "utf-8");
          let newContent = content;
          // Match: type="OldType" → type="NewType" for node declarations
          const regex = new RegExp(`(type=")${escapeRegex(old_type)}(")`, "g");
          newContent = content.replace(regex, `$1${new_type}$2`);
          if (newContent === content) { skipped++; continue; }
          if (!dry_run) fs.writeFileSync(file, newContent, "utf-8");
          const rel = path.relative(project_path, file).replace(/\\/g, "/");
          lines.push(`  ${dry_run ? "[WOULD] " : "[OK] "} ${rel}`);
          modified++;
        } catch { skipped++; continue; }
      }
      lines.push("", `Modified: ${modified}, Skipped: ${skipped}${dry_run ? " (dry run)" : ""}`);
      return lines.join("\n");
    }

    case "add_property": {
      const { property, value } = args;
      if (!property) throw new Error("property required for add_property");
      if (value === undefined) throw new Error("value required for add_property");

      const sceneFiles = files.filter(f => f.endsWith(".tscn"));
      lines.push(`Add property "${property} = ${value}" to ${sceneFiles.length} scene(s)`);
      if (dry_run) lines.push("  (DRY RUN — no changes made)");

      for (const file of sceneFiles) {
        try {
          const content = fs.readFileSync(file, "utf-8");
          // Add property after [node declaration lines
          const lines_arr = content.split("\n");
          let modified_flag = false;
          for (let i = 0; i < lines_arr.length; i++) {
            // Don't add to [gd_scene] or [ext_resource] or [sub_resource] headers
            if (lines_arr[i].startsWith("[node")) {
              // Check if this node already has this property
              const nextLine = lines_arr[i + 1] || "";
              const nextNextLine = lines_arr[i + 2] || "";
              if (!nextLine.startsWith(property + " =") && !nextNextLine.startsWith(property + " =")) {
                lines_arr.splice(i + 1, 0, `${property} = ${value}`);
                modified_flag = true;
                i++; // Skip the line we just added
              }
            }
          }
          if (!modified_flag) { skipped++; continue; }
          if (!dry_run) fs.writeFileSync(file, lines_arr.join("\n"), "utf-8");
          const rel = path.relative(project_path, file).replace(/\\/g, "/");
          lines.push(`  ${dry_run ? "[WOULD] " : "[OK] "} ${rel}`);
          modified++;
        } catch { skipped++; continue; }
      }
      lines.push("", `Modified: ${modified}, Skipped: ${skipped}${dry_run ? " (dry run)" : ""}`);
      return lines.join("\n");
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function collectFiles(projectDir: string, globPattern: string): string[] {
  const extMap: Record<string, string> = {
    "**/*.gd": ".gd",
    "**/*.tscn": ".tscn",
    "**/*.tres": ".tres",
    "**/*.godot": ".godot",
    "**/*": "",
  };
  const targetExt = extMap[globPattern] || path.extname(globPattern.replace(/\*\*/g, "").replace(/\*/g, "x"));
  const result: string[] = [];
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(projectDir, entry.name);
      if (entry.isDirectory()) {
        result.push(...collectFiles(fullPath, globPattern));
      } else if (!targetExt || entry.name.endsWith(targetExt)) {
        result.push(fullPath);
      }
    }
  } catch { /* skip */ }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
