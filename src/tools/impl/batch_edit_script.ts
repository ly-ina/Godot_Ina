// MCP Tool: batch_edit_script — search/replace across multiple files in a project
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface BatchEditScriptArgs {
  /** Path to the Godot project root */
  project_path: string;
  /** String to search for */
  search: string;
  /** String to replace with */
  replace: string;
  /** File pattern: "gd" (scripts), "tscn" (scenes), or "all" (default: "gd") */
  file_type?: "gd" | "tscn" | "all";
  /** Whether to create .bak backups (default: true) */
  create_backup?: boolean;
}

/**
 * Search and replace text across multiple files in a project.
 */
export function batchEditScript(args: BatchEditScriptArgs): string {
  const { project_path, search, replace, file_type = "gd", create_backup = true } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!search) throw new Error("search is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  // Determine file extensions to scan
  const exts: string[] = [];
  if (file_type === "gd" || file_type === "all") exts.push(".gd");
  if (file_type === "tscn" || file_type === "all") exts.push(".tscn");

  // Collect matching files
  const files = collectFiles(project_path, exts);
  if (files.length === 0) {
    return `No ${file_type === "all" ? "script or scene" : file_type} files found in project.`;
  }

  // Process each file
  const results: Array<{ file: string; replaced: number; backedUp: boolean }> = [];
  let totalReplaced = 0;
  const backupDir = create_backup ? path.join(os.tmpdir(), "godot-mcp-backup", Date.now().toString()) : null;
  if (backupDir) fs.mkdirSync(backupDir, { recursive: true });

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const count = (content.match(new RegExp(escapeRegExp(search), "g")) || []).length;

      if (count === 0) continue;

      const modified = content.split(search).join(replace);

      if (create_backup && backupDir) {
        const relPath = path.relative(project_path, filePath);
        const bakPath = path.join(backupDir, relPath);
        const bakDir = path.dirname(bakPath);
        if (!fs.existsSync(bakDir)) fs.mkdirSync(bakDir, { recursive: true });
        fs.copyFileSync(filePath, bakPath);
      }

      fs.writeFileSync(filePath, modified, "utf-8");
      results.push({ file: path.relative(project_path, filePath), replaced: count, backedUp: create_backup });
      totalReplaced += count;
    } catch (e) {
      results.push({ file: path.relative(project_path, filePath), replaced: 0, backedUp: false });
    }
  }

  if (results.length === 0) {
    return `No matches found for "${search}" in ${files.length} ${file_type} file(s).`;
  }

  const lines: string[] = [
    `Batch edit complete: ${totalReplaced} replacement(s) across ${results.length} file(s)`,
    `Search: "${search}" → "${replace}"`,
    `File type: ${file_type}`,
    "",
  ];

  for (const r of results) {
    lines.push(`  ${r.file}: ${r.replaced} replacement(s)`);
  }

  if (create_backup && backupDir) {
    lines.push("", `Backups saved to: ${backupDir}`);
  }

  return lines.join("\n");
}

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      results.push(...collectFiles(fullPath, exts));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
