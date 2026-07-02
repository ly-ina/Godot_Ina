// MCP Tool: delete_file — delete a Godot project file
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface DeleteFileArgs {
  /** Path to the file to delete */
  file_path: string;
  /** Whether to use recycle bin / trash (default: true). When false, permanently deletes. */
  use_trash?: boolean;
}

/**
 * Delete a file from the Godot project.
 * Supports .tscn, .gd, .import, .resource, and other Godot-related file types.
 * By default moves to trash/recycle bin instead of permanent deletion.
 */
export function deleteFile(args: DeleteFileArgs): string {
  const { file_path, use_trash = true } = args;

  // Validate inputs
  if (!file_path) {
    throw new Error("file_path is required");
  }
  if (!fs.existsSync(file_path)) {
    throw new Error(`File not found: ${file_path}`);
  }

  // Check if it's a directory
  const stat = fs.statSync(file_path);
  if (stat.isDirectory()) {
    throw new Error(`"${file_path}" is a directory. Use a file path instead.`);
  }

  // Determine file type
  const ext = path.extname(file_path).toLowerCase();
  const allowedExts = [".tscn", ".gd", ".import", ".resource", ".tres", ".tscn.uid", ".gd.uid"];
  if (!allowedExts.includes(ext)) {
    throw new Error(
      `Unsupported file type: "${ext}". Allowed types: ${allowedExts.join(", ")}`
    );
  }

  // Create backup directory for trash
  const trashDir = path.join(os.tmpdir(), "godot-mcp-trash");
  if (!fs.existsSync(trashDir)) {
    fs.mkdirSync(trashDir, { recursive: true });
  }

  if (use_trash) {
    // Move to trash instead of permanent deletion
    const timestamp = Date.now();
    const trashName = `${path.basename(file_path)}.${timestamp}.bak`;
    const trashPath = path.join(trashDir, trashName);
    fs.copyFileSync(file_path, trashPath);
    fs.unlinkSync(file_path);
    return `Moved "${path.basename(file_path)}" to trash.\n` +
      `Restore from: ${trashPath}\n` +
      `(Trash directory: ${trashDir})`;
  } else {
    // Permanent deletion
    fs.unlinkSync(file_path);
    return `Permanently deleted "${path.basename(file_path)}"`;
  }
}
