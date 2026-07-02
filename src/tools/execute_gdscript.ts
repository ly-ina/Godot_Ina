// MCP Tool: execute_gdscript — execute GDScript code via Godot CLI
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { detectGodotExecutable, executeScript } from "../godot/cli.js";

export interface ExecuteGDScriptArgs {
  /** GDScript code to execute */
  code: string;
  /** Path to a Godot project (required for --script mode) */
  project_path: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Execute GDScript code via Godot's --headless --script mode.
 * Creates a temporary .gd file, runs it, returns output.
 */
export function executeGDScript(args: ExecuteGDScriptArgs): string {
  const { code, project_path, timeout = 30000 } = args;

  if (!code) throw new Error("code is required");
  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) {
    throw new Error(`Project path not found: ${project_path}`);
  }

  // Make sure Godot is available
  try {
    detectGodotExecutable(); // throws if not found
  } catch {
    throw new Error(
      "Godot executable not found. Set GODOT_PATH environment variable " +
      "or install Godot in a standard location."
    );
  }

  // Create a temporary .gd file
  const tmpDir = path.join(os.tmpdir(), "godot-mcp-exec");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpFile = path.join(tmpDir, `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.gd`);

  try {
    // Godot 4.x --script mode requires extending SceneTree or MainLoop
    const wrappedCode = `extends SceneTree\n\nfunc _init():\n\t${code.replace(/\n/g, "\n\t")}\n\tquit()\n`;
    fs.writeFileSync(tmpFile, wrappedCode, "utf-8");

    // Execute via Godot CLI
    const result = executeScript({
      projectPath: project_path,
      scriptPath: tmpFile,
      timeout,
    });

    // Build output
    const lines: string[] = [
      `=== GDScript Execution ===`,
      `Status: ${result.success ? "Completed" : "Failed"}`,
      `Exit Code: ${result.exitCode ?? "(none)"}`,
    ];

    if (result.stdout) {
      // Filter out Godot engine header lines for cleaner output
      const cleanStdout = result.stdout
        .split("\n")
        .filter((l: string) => !l.startsWith("Godot Engine v") && l.trim() !== "")
        .join("\n");
      if (cleanStdout) {
        lines.push(`\n--- stdout ---\n${cleanStdout}`);
      }
    }
    if (result.stderr) {
      lines.push(`\n--- stderr ---\n${result.stderr}`);
    }

    return lines.join("\n");
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}
