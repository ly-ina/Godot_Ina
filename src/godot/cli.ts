// Godot CLI wrapper — auto-detect executable path, run commands, capture output
import * as fs from "fs";
import * as path from "path";
import { execSync, ExecSyncOptions } from "child_process";

export interface GodotExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface RunProjectOptions {
  /** Path to Godot project root directory */
  projectPath: string;
  /** Run mode */
  mode?: "normal" | "headless" | "debug";
  /** Additional CLI arguments to pass to Godot */
  extraArgs?: string[];
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface ExecuteScriptOptions {
  /** Path to Godot project root directory */
  projectPath: string;
  /** Path to .gd script file to execute */
  scriptPath: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Detect Godot executable path on the current system
 */
export function detectGodotExecutable(): string {
  // Check environment variable first
  const envPath = process.env.GODOT_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  // Check common install locations
  const candidates = getCommonGodotPaths();
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Try to find via PATH using Node.js (fast, no subprocess)
  const pathDirs = (process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  const godotName = process.platform === "win32" ? "godot.exe" : "godot";
  for (const dir of pathDirs) {
    const candidate = path.join(dir, godotName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Godot executable not found. Set GODOT_PATH environment variable or " +
    "install Godot and add it to your system PATH."
  );
}

/**
 * Get common Godot installation paths for the current platform
 */
function getCommonGodotPaths(): string[] {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";

  const paths: string[] = [];

  if (isWin) {
    // Windows common paths
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";

    paths.push(
      path.join(localAppData, "Godot", "godot.exe"),
      path.join(localAppData, "Godot", "Godot_v4.3-stable_win64.exe"),
      path.join(localAppData, "Godot", "Godot_v4.2-stable_win64.exe"),
      path.join(programFiles, "Godot", "godot.exe"),
      path.join(programFilesX86, "Godot", "godot.exe"),
    );

    // HOME directory
    const home = process.env.USERPROFILE || "";
    if (home) {
      paths.push(
        path.join(home, "Godot", "godot.exe"),
        path.join(home, "Downloads", "Godot_v4.3-stable_win64.exe"),
      );
    }
  } else if (isMac) {
    paths.push(
      "/Applications/Godot.app/Contents/MacOS/Godot",
      "/Applications/Godot_mono.app/Contents/MacOS/Godot",
      path.join(process.env.HOME || "", "Applications/Godot.app/Contents/MacOS/Godot"),
    );
  } else {
    // Linux
    paths.push(
      "/usr/bin/godot",
      "/usr/local/bin/godot",
      "/snap/bin/godot",
      path.join(process.env.HOME || "", "godot"),
    );
  }

  return paths;
}

/**
 * Validate a Godot project path (check for project.godot)
 */
export function validateGodotProject(projectPath: string): boolean {
  return fs.existsSync(path.join(projectPath, "project.godot"));
}

/**
 * Run a Godot project
 */
export function runProject(options: RunProjectOptions): GodotExecResult {
  const { projectPath, mode = "normal", extraArgs = [], timeout = 30000 } = options;

  // Validate project path
  if (!fs.existsSync(projectPath)) {
    return {
      success: false,
      stdout: "",
      stderr: `Project path not found: ${projectPath}`,
      exitCode: null,
    };
  }

  if (!validateGodotProject(projectPath)) {
    return {
      success: false,
      stdout: "",
      stderr: `No project.godot found in: ${projectPath}. Is this a Godot project?`,
      exitCode: null,
    };
  }

  // Detect Godot executable
  let godotPath: string;
  try {
    godotPath = detectGodotExecutable();
  } catch (e) {
    return {
      success: false,
      stdout: "",
      stderr: e instanceof Error ? e.message : String(e),
      exitCode: null,
    };
  }

  // Build command arguments
  const args: string[] = ["--path", `"${projectPath}"`];

  switch (mode) {
    case "headless":
      args.push("--headless");
      break;
    case "debug":
      args.push("--debug");
      break;
    case "normal":
    default:
      break;
  }

  // Add extra arguments
  args.push(...extraArgs);

  // Build command string
  const command = `"${godotPath}" ${args.join(" ")}`;

  // Execute
  const execOptions: ExecSyncOptions = {
    encoding: "utf-8",
    timeout,
    maxBuffer: 10 * 1024 * 1024, // 10MB
    windowsHide: true,
  };

  try {
    const stdout = execSync(command, execOptions);
    return {
      success: true,
      stdout: stdout.toString(),
      stderr: "",
      exitCode: 0,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      const execError = error as Error & { stdout?: string; stderr?: string; status?: number };
      return {
        success: execError.status === 0,
        stdout: execError.stdout?.toString() || "",
        stderr: execError.stderr?.toString() || error.message,
        exitCode: execError.status ?? null,
      };
    }
    return {
      success: false,
      stdout: "",
      stderr: String(error),
      exitCode: null,
    };
  }
}

/**
 * Execute a GDScript file using Godot CLI
 */
export function executeScript(options: ExecuteScriptOptions): GodotExecResult {
  const { projectPath, scriptPath, timeout = 30000 } = options;

  // Validate script file
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      stdout: "",
      stderr: `Script file not found: ${scriptPath}`,
      exitCode: null,
    };
  }

  return runProject({
    projectPath,
    mode: "headless",
    extraArgs: ["--script", `"${scriptPath}"`],
    timeout,
  });
}
