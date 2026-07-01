// MCP Tool: run_project — run a Godot project via CLI
import { runProject, validateGodotProject } from "../godot/cli.js";
import * as fs from "fs";

export interface RunProjectArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Run mode: "normal", "headless", or "debug" */
  mode?: "normal" | "headless" | "debug";
  /** Extra CLI arguments */
  extra_args?: string[];
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Run a Godot project
 */
export function runGodotProject(args: RunProjectArgs): string {
  const { project_path, mode = "normal", extra_args, timeout } = args;

  if (!project_path) {
    throw new Error("project_path is required");
  }

  if (!fs.existsSync(project_path)) {
    throw new Error(`Project path not found: ${project_path}`);
  }

  if (!validateGodotProject(project_path)) {
    throw new Error(
      `No project.godot found in: ${project_path}. Use list_scenes to find a valid Godot project path.`
    );
  }

  const result = runProject({
    projectPath: project_path,
    mode,
    extraArgs: extra_args,
    timeout,
  });

  const status = result.success ? "Completed" : "Failed";
  const lines = [
    `=== Godot Project Run ===`,
    `Project: ${project_path}`,
    `Mode: ${mode}`,
    `Status: ${status}`,
    `Exit Code: ${result.exitCode ?? "(none)"}`,
  ];

  if (result.stdout) {
    lines.push(`\n--- stdout ---\n${result.stdout}`);
  }
  if (result.stderr) {
    lines.push(`\n--- stderr ---\n${result.stderr}`);
  }

  return lines.join("\n");
}
