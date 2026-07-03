// MCP Tool: launch_editor — open Godot editor for manual editing
// Hybrid workflow: AI does code/structure, human does visual layout.
// Opens Godot editor and blocks until the user closes it.
import * as fs from "fs";
import * as path from "path";
import { spawn, spawnSync } from "child_process";
import { detectGodotExecutable } from "../godot/cli.js";

export interface LaunchEditorArgs {
  project_path: string;
  /** Scene file to open (e.g. scenes/Main.tscn). Optional — opens project root if omitted. */
  scene_path?: string;
  /** Max wait time in seconds (default: 300 = 5 minutes, 0 = no wait) */
  timeout?: number;
  /** Don't wait — just open and return immediately */
  detach?: boolean;
}

export function launchEditor(args: LaunchEditorArgs): string {
  const { project_path, timeout = 300, detach } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project not found: ${project_path}`);

  // Detect Godot executable
  let godotPath: string;
  try {
    godotPath = detectGodotExecutable();
  } catch {
    return "⚠️ 找不到 Godot 可执行文件。请设置 GODOT_PATH 环境变量指向 Godot 4.x。\n\n目前暂时无法打开编辑器，你可以手动操作：\n" +
      `1. 用 Godot 打开项目: godot --editor --path "${project_path}"\n` +
      `2. 编辑完成后关闭 Godot\n` +
      `3. 告诉我你做了哪些修改，我会读取更新后的文件。`;
  }

  const scenePathAbsolute = args.scene_path
    ? path.resolve(project_path, args.scene_path)
    : "";

  // Record file mtimes before opening
  const before = snapshotMtime(project_path);

  // Build editor arguments
  const editorArgs = ["--editor", "--path", project_path];
  if (scenePathAbsolute && fs.existsSync(scenePathAbsolute)) {
    editorArgs.push(scenePathAbsolute);
  }

  if (detach) {
    // Detach: open and return immediately
    const child = spawn(godotPath, editorArgs, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return (
      `✅ Godot 编辑器已启动。\n` +
      (args.scene_path ? `   打开场景: ${args.scene_path}\n` : "") +
      `   窗口应该在桌面上出现了。\n` +
      `   编辑完成后保存并关闭 Godot，然后告诉我你做了哪些修改。`
    );
  }

  // Blocking mode: use spawnSync to wait for Godot to close
  const timeoutMs = timeout > 0 ? timeout * 1000 : undefined;
  console.error(`Launching Godot editor: ${godotPath} ${editorArgs.join(" ")}`);
  const result = spawnSync(godotPath, editorArgs, {
    stdio: "inherit",
    timeout: timeoutMs,
  });

  if (result.error) {
    return `⚠️ Godot 编辑器异常退出: ${result.error.message}`;
  }
  if (result.status !== 0 && result.status !== null) {
    return `⚠️ Godot 编辑器退出码: ${result.status}`;
  }

  return formatChanges(before, snapshotMtime(project_path));
}

/** Snapshot project file modification times */
function snapshotMtime(projectPath: string): Map<string, number> {
  const map = new Map<string, number>();
  try {
    const entries = fs.readdirSync(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(projectPath, entry.name);
      if (entry.isDirectory()) {
        // Recursively snapshot, but limit depth for performance
        walkDir(fullPath, map, projectPath, 0);
      } else if (entry.name.endsWith(".tscn") || entry.name.endsWith(".gd") || entry.name.endsWith(".tres")) {
        try {
          const stat = fs.statSync(fullPath);
          map.set(path.relative(projectPath, fullPath).replace(/\\/g, "/"), stat.mtimeMs);
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return map;
}

function walkDir(dir: string, map: Map<string, number>, base: string, depth: number) {
  if (depth > 3) return; // Don't go too deep
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, map, base, depth + 1);
      } else if (entry.name.endsWith(".tscn") || entry.name.endsWith(".gd") || entry.name.endsWith(".tres") || entry.name.endsWith(".godot")) {
        try {
          const stat = fs.statSync(fullPath);
          map.set(path.relative(base, fullPath).replace(/\\/g, "/"), stat.mtimeMs);
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
}

/** Compare mtime snapshots and list changed files */
function formatChanges(before: Map<string, number>, after: Map<string, number>): string {
  const changed: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];

  for (const [file, mtimeAfter] of after) {
    const mtimeBefore = before.get(file);
    if (mtimeBefore === undefined) {
      added.push(file);
    } else if (mtimeAfter !== mtimeBefore) {
      changed.push(file);
    }
  }
  for (const file of before.keys()) {
    if (!after.has(file)) {
      deleted.push(file);
    }
  }

  const lines: string[] = ["✅ Godot 编辑器已关闭。修改摘要："];
  if (changed.length > 0) {
    lines.push("", "修改的文件：");
    for (const f of changed) lines.push(`  • ${f}`);
  }
  if (added.length > 0) {
    lines.push("", "新增的文件：");
    for (const f of added) lines.push(`  • ${f}`);
  }
  if (deleted.length > 0) {
    lines.push("", "删除的文件：");
    for (const f of deleted) lines.push(`  • ${f}`);
  }
  if (changed.length === 0 && added.length === 0 && deleted.length === 0) {
    lines.push("  （未检测到任何改动）");
  }
  lines.push("", "需要我读取这些文件看具体改了些什么吗？");
  return lines.join("\n");
}
