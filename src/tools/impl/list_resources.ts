// MCP Tool: list_resources — list resource files in a Godot project
import * as fs from "fs";
import * as path from "path";

export interface ListResourcesArgs {
  /** Path to the Godot project root */
  project_path: string;
  /** Optional filter by resource type: image, audio, font, scene, script, all */
  type?: "image" | "audio" | "font" | "scene" | "script" | "all";
}

const EXT_MAP: Record<string, string[]> = {
  image: [".png", ".jpg", ".jpeg", ".svg", ".webp", ".bmp", ".tga", ".exr"],
  audio: [".ogg", ".mp3", ".wav", ".flac"],
  font: [".ttf", ".otf", ".woff", ".woff2"],
  scene: [".tscn"],
  script: [".gd"],
};

/**
 * List resource files in a Godot project directory.
 */
export function listResources(args: ListResourcesArgs): string {
  const { project_path, type = "all" } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const exts = type === "all" ? Object.values(EXT_MAP).flat() : (EXT_MAP[type] || []);
  if (exts.length === 0) throw new Error(`Unknown resource type: ${type}`);

  const files: Array<{ path: string; size: number; ext: string }> = [];
  walkDir(project_path, files, exts);

  if (files.length === 0) {
    let typeLabel = type === "all" ? "resources" : `${type} resources`;
    return `No ${typeLabel} found in ${path.basename(project_path)}`;
  }

  const typeLabel = type === "all" ? "Resource" : type.charAt(0).toUpperCase() + type.slice(1);
  const lines: string[] = [
    `${typeLabel} files found: ${files.length}`,
    `Path: ${project_path}`,
    "",
  ];

  // Group by extension
  const grouped = new Map<string, typeof files>();
  for (const f of files) {
    const g = grouped.get(f.ext) || [];
    g.push(f);
    grouped.set(f.ext, g);
  }

  for (const [ext, items] of grouped) {
    lines.push(`  ${ext} (${items.length}):`);
    for (const item of items) {
      const relPath = path.relative(project_path, item.path);
      const sizeStr = formatSize(item.size);
      lines.push(`    - ${relPath} (${sizeStr})`);
    }
  }

  return lines.join("\n");
}

function walkDir(dir: string, results: Array<{ path: string; size: number; ext: string }>, exts: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      walkDir(fullPath, results, exts);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) {
        try {
          const stat = fs.statSync(fullPath);
          results.push({ path: fullPath, size: stat.size, ext });
        } catch { /* skip unreadable */ }
      }
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
