// MCP Tool: search_code — search GDScript text across the project
// Fills the gap: analyze_project can search nodes, but not code text.
import * as fs from "fs";
import * as path from "path";

export interface SearchCodeArgs {
  project_path: string;
  /** Search pattern (case-sensitive by default) */
  pattern: string;
  /** Search as regex instead of plain text */
  regex?: boolean;
  /** Case insensitive search */
  ignore_case?: boolean;
  /** Glob pattern to filter files (default: **\/*.gd) */
  glob?: string;
  /** Max results (default: 50) */
  max_results?: number;
}

export function searchCode(args: SearchCodeArgs): string {
  const { project_path, pattern, regex, ignore_case, glob = "**/*.gd", max_results = 50 } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!pattern) throw new Error("pattern is required");

  const results: Array<{ file: string; line: number; text: string }> = [];
  let totalFiles = 0;

  walkDir(project_path, (filePath) => {
    if (totalFiles >= max_results * 10) return; // Guard: don't scan too many files
    totalFiles++;
    const ext = path.extname(filePath);
    if (!ext.match(/\.(gd|tscn|tres|godot)$/)) {
      // Only search .gd by default, but also allow .tscn/.tres with glob override
      if (glob === "**/*.gd" && ext !== ".gd") return;
    }
    // Check glob pattern
    if (glob !== "**/*" && !filePath.includes(glob.replace(/\*\*/g, "").replace(/\*/g, ""))) {
      // Simple glob matching for common cases
      const relPath = path.relative(project_path, filePath).replace(/\\/g, "/");
      const globPattern = glob.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".");
      if (!new RegExp(`^${globPattern}$`).test(relPath)) return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match: boolean;
        if (regex) {
          try {
            const flags = ignore_case ? "i" : "";
            match = new RegExp(pattern, flags).test(line);
          } catch {
            match = false;
          }
        } else if (ignore_case) {
          match = line.toLowerCase().includes(pattern.toLowerCase());
        } else {
          match = line.includes(pattern);
        }
        if (match) {
          results.push({
            file: path.relative(project_path, filePath).replace(/\\/g, "/"),
            line: i + 1,
            text: line.trim(),
          });
          if (results.length >= max_results) return;
        }
      }
    } catch {
      // Skip unreadable files
    }
  });

  if (results.length === 0) return `No matches found for: ${pattern}`;

  const lines: string[] = [`Search results for "${pattern}": ${results.length} match(es)`, ""];
  for (const r of results) {
    lines.push(`  ${r.file}:${r.line}  ${r.text.substring(0, 120)}`);
  }
  return lines.join("\n");
}

function walkDir(dir: string, callback: (filePath: string) => void): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  } catch {
    // Skip unreadable dirs
  }
}
