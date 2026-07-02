// MCP Tool: demo_character — creates a character and runs it in Godot
import * as fs from "fs";
import * as path from "path";
import { generateAnimation } from "./generate_animation.js";
import { initProject } from "./init_project.js";
import { runGodotProject } from "./run_project.js";

export interface DemoCharacterArgs {
  /** Path to Godot project root (created if doesn't exist) */
  project_path: string;
  /** Character name */
  name?: string;
  /** AI behavior: "wander" (walks around randomly), "patrol" (follows waypoints), "idle" (stands still) */
  behavior?: "wander" | "patrol" | "idle";
  /** Frame width (default: 32) */
  frame_width?: number;
  /** Frame height (default: 48) */
  frame_height?: number;
}

/**
 * One-command demo: generates a character with AI behavior, sets up the project,
 * and runs it in Godot so you can see the character moving.
 */
export function demoCharacter(args: DemoCharacterArgs): string {
  const { project_path, name = "demo_char", behavior = "wander", frame_width = 32, frame_height = 48 } = args;

  if (!project_path) throw new Error("project_path is required");

  // Ensure project exists
  if (!fs.existsSync(project_path)) {
    initProject({ project_path, project_name: name });
  }

  // 1. Generate animation system (scene + AnimatedSprite2D + basic controller)
  const animResult = generateAnimation({
    project_path,
    name,
    frame_width,
    frame_height,
    idle: true,
    walk: true,
    run: true,
    crouch: false,
    turn: true,
    jump: true,
  });

  // 2. Read the generated script and extend it with AI behavior
  const scriptPath = path.resolve(project_path, "scripts", "characters", `${name}.gd`);
  let scriptContent = fs.readFileSync(scriptPath, "utf-8");

  // Remove the _physics_process that uses Input (not available in headless)
  // and replace with AI-driven behavior
  const aiScript = generateAIScript(name, behavior);
  fs.writeFileSync(scriptPath, aiScript, "utf-8");

  // 3. Update project.godot to use this character as main scene
  const projectFile = path.join(project_path, "project.godot");
  let projectConfig = fs.readFileSync(projectFile, "utf-8");
  projectConfig = projectConfig.replace(
    /run\/main_scene="[^"]+"/,
    `run/main_scene="res://scenes/characters/${name}.tscn"`
  );
  fs.writeFileSync(projectFile, projectConfig, "utf-8");

  // 4. Try to run the project
  const runResult = tryRunProject(project_path);

  return [
    `Demo character "${name}" ready`,
    `  Behavior: ${behavior} (${behavior === "wander" ? "walks around randomly" : behavior === "patrol" ? "walks between waypoints" : "stands in place"})`,
    `  Scene: scenes/characters/${name}.tscn`,
    `  Script: scripts/characters/${name}.gd`,
    `  Main scene set to character`,
    ``,
    `Godot run: ${runResult}`,
    ``,
    `The character will auto-walk in the project.`,
    `Open the project in Godot editor to see it in action.`,
  ].join("\n");
}

function generateAIScript(name: string, behavior: string): string {
  const btDesc = behavior === "wander"
    ? "walks in random directions, turns around when hitting walls"
    : behavior === "patrol"
    ? "walks between predefined waypoints"
    : "stands in place, occasionally looks around";

  const behaviorCode = behavior === "wander" ? `
func _physics_process(delta: float) -> void:
	_behavior_timer -= delta
	if _behavior_timer <= 0:
		_pick_random_direction()
		_behavior_timer = randf_range(1.0, 3.0)
	
	if _current_dir != Vector2.ZERO:
		anim.play("walk")
		velocity = _current_dir * speed
		anim.scale.x = 1 if _current_dir.x > 0 else -1 if _current_dir.x < 0 else anim.scale.x
	else:
		anim.play("idle")
		velocity = Vector2.ZERO
	
	move_and_slide()
	
	# Bounce off walls
	if is_on_wall():
		_current_dir.x *= -1
	
	# Randomly look around while idling
	if _current_dir == Vector2.Zero and randf() > 0.98:
		anim.scale.x *= -1

func _pick_random_direction() -> void:
	var dirs := [Vector2.RIGHT, Vector2.LEFT, Vector2.ZERO]
	_current_dir = dirs[randi() % dirs.size()]
` : behavior === "patrol" ? `
func _physics_process(delta: float) -> void:
	if _waypoints.size() == 0:
		anim.play("idle")
		return
	
	var target := _waypoints[_current_waypoint]
	var dist := global_position.distance_to(target)
	
	if dist < 8.0:
		_current_waypoint = (_current_waypoint + 1) % _waypoints.size()
		_behavior_timer = 0.5
		anim.play("idle")
		return
	
	var dir := (target - global_position).normalized()
	anim.play("walk")
	velocity = dir * speed
	anim.scale.x = 1 if dir.x > 0 else -1
	move_and_slide()

func _add_waypoints() -> void:
	# Add some waypoints around the spawn position
	var start := global_position
	_waypoints = [
		start + Vector2(100, 0),
		start + Vector2(100, 100),
		start + Vector2(0, 100),
		start + Vector2(0, 0),
	]
` : `
func _physics_process(delta: float) -> void:
	_behavior_timer -= delta
	velocity = Vector2.ZERO
	
	if _behavior_timer <= 0:
		_behavior_timer = randf_range(2.0, 5.0)
		# Look around occasionally
		if randf() > 0.5:
			anim.scale.x *= -1
	
	anim.play("idle")
	move_and_slide()
`;

  return `extends CharacterBody2D

# AI-driven ${name} — ${btDesc}
@onready var anim: AnimatedSprite2D = $AnimatedSprite2D

@export var speed: float = 60.0

var _current_dir: Vector2 = Vector2.ZERO
var _behavior_timer: float = 0.0
var _waypoints: Array[Vector2] = []
var _current_waypoint: int = 0

func _ready() -> void:
	anim.play("idle")
	_behavior_timer = randf_range(0.5, 2.0)
	${behavior === "patrol" ? "_add_waypoints()" : ""}

${behaviorCode}
`;
}

function tryRunProject(projectPath: string): string {
  try {
    runGodotProject({
      project_path: projectPath,
      mode: "headless",
      timeout: 5000,
    });
    return "Project started (headless mode)";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Godot") || msg.includes("not found") || msg.includes("ENOENT")) {
      return `Godot not available — set GODOT_PATH or open the project manually.`;
    }
    return `Run attempted: ${msg}`;
  }
}
