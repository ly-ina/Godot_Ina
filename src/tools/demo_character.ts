// MCP Tool: demo_character — creates a character and runs it in Godot
// End-to-end demo: sprite + scene + AI behavior + environment + procedural animation
import * as fs from "fs";
import * as path from "path";
import { generateAnimation } from "./generate_animation.js";
import { initProject } from "./init_project.js";

export interface DemoCharacterArgs {
  /** Path to Godot project root (created if doesn't exist) */
  project_path: string;
  /** Character name */
  name?: string;
  /** Path to sprite image PNG (relative to project root) */
  sprite_path?: string;
  /** Sprite region rect "x,y,w,h" to crop one frame from a sheet */
  region?: string;
  /** AI behavior: "wander" (default), "patrol", "idle" */
  behavior?: "wander" | "patrol" | "idle";
}

/**
 * One-command demo: generates a complete runnable Godot project with a character.
 *
 * Creates:
 * 1. Character scene (CharacterBody2D + Sprite2D + CollisionShape2D + Camera2D)
 * 2. AI behavior script with PROCEDURAL ANIMATION (walk bob, idle breathe, turn)
 * 3. Main scene (background + ground walls + character instance)
 * 4. Configures main_scene in project.godot
 *
 * Key fixes (2026-07-03):
 * - Procedural animation via GDScript — no multi-frame sprite needed
 * - Complete environment with floor + left/right walls
 * - Camera follows character with limits so movement is VISIBLE
 * - Sprite uses region crop for clean single-character display
 */
export function demoCharacter(args: DemoCharacterArgs): string {
  const { project_path, name = "demo_char", sprite_path, region, behavior = "wander" } = args;

  if (!project_path) throw new Error("project_path is required");

  if (!fs.existsSync(project_path)) {
    initProject({ project_path, project_name: `${name}_demo` });
  }

  // 1. Generate scene + base controller
  generateAnimation({
    project_path,
    name,
    sprite_path,
    region,
    idle: true,
    walk: true,
  });

  // 2. Write AI script with procedural animation
  const scriptPath = path.resolve(project_path, "scripts", "characters", `${name}.gd`);
  const aiScript = buildAIScript(name, behavior);
  fs.writeFileSync(scriptPath, aiScript, "utf-8");

  // 3. Create Main scene with full environment (floor + walls + sky)
  createMainScene(project_path, name, sprite_path, region);

  // 4. Set Main.tscn as main scene
  const projectFile = path.join(project_path, "project.godot");
  let projectConfig = fs.readFileSync(projectFile, "utf-8");
  projectConfig = projectConfig.replace(
    /run\/main_scene="[^"]*"/,
    `run/main_scene="res://scenes/Main.tscn"`
  );
  fs.writeFileSync(projectFile, projectConfig, "utf-8");

  return [
    `Demo "${name}" ready — ${behavior} mode`,
    ``,
    `Files created:`,
    `  scenes/characters/${name}.tscn`,
    `  scripts/characters/${name}.gd   (AI + procedural animation)`,
    `  scenes/Main.tscn                (floor + walls + sky)`,
    ``,
    ...(sprite_path ? [`Sprite: res://${sprite_path}`, ...(region ? [`Crop: ${region}`] : [])] : []),
    `Behavior: ${behavior}`,
    ``,
    `Run: godot --path <project> --scene res://scenes/Main.tscn`,
  ].join("\n");
}

// ──────────────────────────────────────────────
// AI Script Builder — includes procedural animation
// ──────────────────────────────────────────────

function buildAIScript(charName: string, behavior: string): string {
  // GDScript 2.0 strict typing rules (verified 2026-07-03):
  // - NEVER use `:=` with method return values (abs(), sin(), randi(), move_toward() etc.)
  //   Godot treats these as Variant inference and errors in strict mode
  // - ALWAYS use explicit `: float`, `: int`, `: bool` etc.
  // - Use `absf()` not `abs()` for float absolute value
  // - Use `if x == null:` not `if not x:` for nullable checks
  //
  // NOTE: $Visual is either Sprite2D (with sprite_path) or ColorRect (no sprite).
  // Both support scale.x for flip and position.y for bob animation.

  return `extends CharacterBody2D

# ${charName} — AI-driven demo character
# Uses procedural animation (bob + flip) — no sprite frames needed
# Visual node ($Visual) is either Sprite2D or ColorRect depending on whether
# a sprite image was provided. Both support all animation operations.

@onready var _visual: CanvasItem = $Visual
@onready var _head: CanvasItem = $Head if has_node("Head") else null

# ── Movement config ──
@export var speed: float = 100.0
@export var gravity: float = 500.0

# ── Animation config ──
@export var walk_bob_speed: float = 12.0      # Cycles per second while walking
@export var walk_bob_amount: float = 3.0       # Pixels up/down
@export var breathe_speed: float = 1.5         # Breathing cycles/sec when idle
@export var breathe_amount: float = 0.8        # Scale change when breathing
@export var turn_duration: float = 0.25        # Seconds to flip direction

# ── Internal state ──
var _facing_right: bool = true
var _timer: float = 0.0
var _move_dir: Vector2 = Vector2.RIGHT
var _is_moving: bool = true
var _anim_time: float = 0.0                    # Accumulated time for animations
var _target_scale_x: float = 1.0               # For smooth turning
var _base_y: float = 0.0                       # Sprite's original Y offset

func _ready() -> void:
	_pick_direction()
	_timer = randf_range(1.0, 3.0)
	if _visual != null:
		_base_y = _visual.position.y
		_target_scale_x = absf(_visual.scale.x)
	else:
		_target_scale_x = 0.25

func _physics_process(delta: float) -> void:
	_anim_time += delta
	
	# Gravity
	if not is_on_floor():
		velocity.y += gravity * delta
	
	${getBehaviorCode(behavior)}
	
	move_and_slide()
	
	# Apply procedural animation
	_apply_animation(delta)
	
	# Wall bounce
	var slide_count: int = get_slide_collision_count()
	for i: int in range(slide_count):
		var col: KinematicCollision2D = get_slide_collision(i)
		var normal: Vector2 = col.get_normal()
		if absf(normal.dot(Vector2(1, 0))) > 0.7:
			_move_dir.x *= -1
			_facing_right = _move_dir.x > 0
			_update_flip()
			_timer = randf_range(0.3, 1.0)
		break

# ── Procedural animation (no sprite frames needed!) ──
func _apply_animation(delta: float) -> void:
	if _visual == null:
		return
	
	# Smooth scale interpolation for direction changes
	var current_sx: float = absf(_visual.scale.x)
	var target_sx: float = absf(_target_scale_x)
	var new_sx: float = move_toward(current_sx, target_sx, delta * 8.0)
	
	if _is_moving and _move_dir.length() > 0:
		# Walking: vertical bob (simulates foot steps)
		var bob: float = sin(_anim_time * walk_bob_speed * TAU) * walk_bob_amount
		_visual.position.y = _base_y + bob
		_visual.scale.x = new_sx if _facing_right else -new_sx
	else:
		# Idle: gentle breathing (scale pulse)
		var breath: float = 1.0 + sin(_anim_time * breathe_speed * TAU) * breathe_amount * 0.01
		_visual.position.y = move_toward(_visual.position.y, _base_y, delta * 10.0)
		_visual.scale.x = (new_sx * breath) if _facing_right else -(new_sx * breath)

# ── Direction control ──
func _pick_direction() -> void:
	var roll: int = randi() % 3
	match roll:
		0:
			_move_dir = Vector2.RIGHT
			_facing_right = true
		1:
			_move_dir = Vector2.LEFT
			_facing_right = false
		2:
			_move_dir = Vector2.ZERO
			_is_moving = false
			_timer = randf_range(1.5, 3.5)
			return
	
	_is_moving = true
	_update_flip()
	_timer = randf_range(1.5, 4.0)

func _update_flip() -> void:
	pass  # Scale handled by _apply_animation smooth interp
`;
}

function getBehaviorCode(behavior: string): string {
  switch (behavior) {
    case "wander":
      return `	# ── Wander AI ──
	_timer -= delta
	if _timer <= 0:
		if _is_moving:
			if randf() < 0.15:
				_is_moving = false
				_timer = randf_range(2.0, 4.0)
				if randf() < 0.6:
					_facing_right = not _facing_right
			else:
				_pick_direction()
		else:
			_is_moving = true
			_pick_direction()
	
	if _is_moving:
		velocity.x = _move_dir.x * speed
	else:
		velocity.x = move_toward(velocity.x, 0, speed * delta * 5)`;

    case "patrol":
      return `	# ── Patrol AI ──
	if _waypoints.size() == 0:
		_setup_waypoints()
	
	var target: Vector2 = _waypoints[_wp_index]
	var dist: float = global_position.distance_to(target)
	
	if dist < 10.0:
		_wp_index = (_wp_index + 1) % _waypoints.size()
		_pause_timer = 0.5
		velocity.x = move_toward(velocity.x, 0, speed * 5)
		return
	
	if _pause_timer > 0:
		_pause_timer -= delta
		velocity.x = move_toward(velocity.x, 0, speed * 5)
		return
	
	var dir := (target - global_position).normalized()
	velocity.x = dir.x * speed
	_facing_right = dir.x > 0
	_update_flip()

var _waypoints: Array[Vector2] = []
var _wp_index: int = 0
var _pause_timer: float = 0.0

func _setup_waypoints() -> void:
	var start := global_position
	_waypoints = [
		start + Vector2(200, 0),
		start + Vector2(200, 100),
		start + Vector2(-200, 100),
		start + Vector2(-200, 0),
	]`;

    case "idle":
      return `	# ── Idle AI — stand still, look around occasionally ──
	velocity.x = move_toward(velocity.x, 0, speed * delta * 5)
	_timer -= delta
	if _timer <= 0:
		_timer = randf_range(2.0, 5.0)
		if randf() > 0.5:
			_facing_right = not _facing_right
			_update_flip()`;

    default:
      return `\tvelocity.x = 0`;
  }
}

// ──────────────────────────────────────────────
// Main Scene Creator — full playable environment
// ──────────────────────────────────────────────

function createMainScene(projectPath: string, charName: string, spritePath?: string, regionStr?: string): void {
  const scenesDir = path.resolve(projectPath, "scenes");
  if (!fs.existsSync(scenesDir)) fs.mkdirSync(scenesDir, { recursive: true });
  const L: string[] = [
    `[gd_scene load_steps=${spritePath ? 5 : 4} format=3 uid="uid://demomain001"]`,
    `[ext_resource type="Script" path="res://scripts/characters/${charName}.gd" id="1"]`,
  ];
  if (spritePath) L.push(`[ext_resource type="Texture2D" path="res://${spritePath}" id="2"]`);
  L.push(
    `[sub_resource type="RectangleShape2D" id="Shape"]`,
    `size = Vector2(40, 72)`,
    `[node name="Main" type="Node2D"]`,
    `[node name="Sky" type="ColorRect" parent="."]`,
    `anchor_right = 1.0`,
    `anchor_bottom = 1.0`,
    `color = Color(0.12, 0.14, 0.22, 1)`,
    `[node name="Ground" type="StaticBody2D" parent="."]`,
    `position = Vector2(0, 300)`,
    `[node name="GroundVisual" type="ColorRect" parent="Ground"]`,
    `offset_left = -2000`,
    `offset_top = -10`,
    `offset_right = 2000`,
    `offset_bottom = 10`,
    `color = Color(0.18, 0.38, 0.18, 1)`,
    `[node name="GroundCollision" type="CollisionShape2D" parent="Ground"]`,
    `shape = SubResource("Shape")`,
    `[node name="LeftWall" type="StaticBody2D" parent="."]`,
    `position = Vector2(-480, 150)`,
    `[node name="LeftCollision" type="CollisionShape2D" parent="LeftWall"]`,
    `shape = SubResource("Shape")`,
    `[node name="RightWall" type="StaticBody2D" parent="."]`,
    `position = Vector2(480, 150)`,
    `[node name="RightCollision" type="CollisionShape2D" parent="RightWall"]`,
    `shape = SubResource("Shape")`,
    `[node name="${charName}" type="CharacterBody2D" parent="."]`,
    `position = Vector2(0, 100)`,
    `script = ExtResource("1")`,
  );
  if (spritePath) {
    L.push(
      `[node name="Visual" type="Sprite2D" parent="${charName}"]`,
      `texture = ExtResource("2")`,
    );
    if (regionStr) L.push(`region_enabled = true`, `region_rect = Rect2(${regionStr})`);
    L.push(`scale = Vector2(0.25, 0.25)`);
  } else {
    L.push(
      `[node name="Visual" type="ColorRect" parent="${charName}"]`,
      `offset_left = -15`,
      `offset_top = -72`,
      `offset_right = 15`,
      `offset_bottom = 0`,
      `color = Color(0.45, 0.55, 0.85, 1)`,
      `[node name="Head" type="ColorRect" parent="${charName}"]`,
      `offset_left = -10`,
      `offset_top = -85`,
      `offset_right = 10`,
      `offset_bottom = -72`,
      `color = Color(0.85, 0.7, 0.55, 1)`,
    );
  }
  L.push(
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="${charName}"]`,
    `shape = SubResource("Shape")`,
    `[node name="Camera2D" type="Camera2D" parent="${charName}"]`,
    `position_smoothing_enabled = true`,
    `position_smoothing_speed = 4.0`,
    `offset = Vector2(0, -30)`,
    `limit_left = -500`,
    `limit_right = 500`,
    `limit_top = -500`,
    `limit_bottom = 500`,
  );
  fs.writeFileSync(path.join(scenesDir, "Main.tscn"), L.join("\n"), "utf-8");
}
