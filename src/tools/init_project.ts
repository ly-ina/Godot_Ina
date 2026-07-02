// MCP Tool: init_project — create a standard Godot project skeleton
import * as fs from "fs";
import * as path from "path";

export interface InitProjectArgs {
  /** Path where the project should be created */
  project_path: string;
  /** Name of the project (defaults to directory name) */
  project_name?: string;
  /** Resolution width (default: 1152) */
  width?: number;
  /** Resolution height (default: 648) */
  height?: number;
}

/**
 * Create a standard Godot 4.x project skeleton with recommended structure.
 */
export function initProject(args: InitProjectArgs): string {
  const { project_path, project_name, width = 1152, height = 648 } = args;

  if (!project_path) throw new Error("project_path is required");
  if (fs.existsSync(project_path)) {
    throw new Error(`Directory already exists: ${project_path}`);
  }

  const name = project_name || path.basename(project_path);

  // Create directory structure
  const dirs = [
    project_path,
    path.join(project_path, "scenes"),
    path.join(project_path, "scripts"),
    path.join(project_path, "assets"),
    path.join(project_path, "assets", "textures"),
    path.join(project_path, "assets", "audio"),
    path.join(project_path, "assets", "fonts"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create project.godot
  const projectGodot = [
    `; ${name}`,
    `config_version=5`,
    ``,
    `[application]`,
    `config/name="${name}"`,
    `run/main_scene="res://scenes/Main.tscn"`,
    `config/version="1.0.0"`,
    ``,
    `[display]`,
    `window/size/viewport_width=${width}`,
    `window/size/viewport_height=${height}`,
    `window/size/mode=0`,
    `window/stretch/mode="viewport"`,
    ``,
    `[rendering]`,
    `renderer/rendering_method="mobile"`,
    `renderer/rendering_method.mobile="mobile"`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(project_path, "project.godot"), projectGodot, "utf-8");

  // Create Main.tscn
  const mainScene = [
    `[gd_scene load_steps=1 format=3 uid="uid://project_main"]`,
    ``,
    `[node name="Main" type="Node2D"]`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(project_path, "scenes", "Main.tscn"), mainScene, "utf-8");

  // Create .gitignore
  const gitignore = [
    `node_modules/`,
    `.workbuddy/`,
    `*.bak`,
    `*.log`,
  ].join("\n");
  fs.writeFileSync(path.join(project_path, ".gitignore"), gitignore, "utf-8");

  return [
    `Created Godot project: ${name}`,
    `  Path: ${project_path}`,
    `  Resolution: ${width}x${height}`,
    `  Main scene: scenes/Main.tscn`,
    ``,
    `Directory structure:`,
    `  scenes/       - Scene files`,
    `  scripts/      - GDScript files`,
    `  assets/       - Resource files`,
    `  assets/textures/ - Images and sprites`,
    `  assets/audio/    - Sound and music`,
    `  assets/fonts/    - Font files`,
  ].join("\n");
}
