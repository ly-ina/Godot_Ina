// MCP Tool: read_script — read a .gd GDScript file
import * as fs from "fs";

export interface ReadScriptArgs {
  /** Path to the .gd script file */
  script_path: string;
}

/**
 * Read a GDScript file and return its content
 */
export function readScript(args: ReadScriptArgs): string {
  const { script_path } = args;

  if (!script_path) {
    throw new Error("script_path is required");
  }

  if (!script_path.endsWith(".gd")) {
    throw new Error(`File is not a .gd script: ${script_path}`);
  }

  if (!fs.existsSync(script_path)) {
    throw new Error(`Script file not found: ${script_path}`);
  }

  const content = fs.readFileSync(script_path, "utf-8");
  const lines = content.split("\n").length;

  return `Script: ${script_path}\nLines: ${lines}\n\n${content}`;
}
