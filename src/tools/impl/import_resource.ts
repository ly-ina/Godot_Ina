// MCP Tool: import_resource — import external resource files into a Godot project
import * as fs from "fs";
import * as path from "path";

export interface ImportResourceArgs {
  /** Source file path (external file to import) */
  source_path: string;
  /** Destination path inside the Godot project */
  dest_path: string;
  /** Create subdirectories if needed (default: true) */
  mkdir?: boolean;
}

const ALLOWED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".svg", ".webp", ".bmp", ".tga", ".exr",
  ".ogg", ".mp3", ".wav", ".flac",
  ".ttf", ".otf", ".woff", ".woff2",
  ".glb", ".gltf", ".obj", ".blend",
  ".tscn", ".gd",
];

/**
 * Import a resource file into a Godot project.
 * Copies the source file to the destination path.
 */
export function importResource(args: ImportResourceArgs): string {
  const { source_path, dest_path, mkdir = true } = args;

  if (!source_path) throw new Error("source_path is required");
  if (!dest_path) throw new Error("dest_path is required");

  if (!fs.existsSync(source_path)) {
    throw new Error(`Source file not found: ${source_path}`);
  }

  const ext = path.extname(source_path).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported resource type: "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (fs.existsSync(dest_path)) {
    // Check if user wants to overwrite — since we can't prompt, report and stop
    throw new Error(
      `Destination already exists: ${dest_path}\n` +
      `Tip: Use delete_file first, then re-import.`
    );
  }

  // Create destination directory
  if (mkdir) {
    const destDir = path.dirname(dest_path);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
  }

  // Copy the file
  fs.copyFileSync(source_path, dest_path);

  const srcStat = fs.statSync(source_path);
  const sizeStr = formatSize(srcStat.size);

  return [
    `Imported resource: ${path.basename(source_path)}`,
    `  From: ${source_path}`,
    `  To: ${dest_path}`,
    `  Size: ${sizeStr}`,
    `  Type: ${ext}`,
  ].join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
