// MCP Tool: generate_component — generate common game component patterns
//
// This tool creates complete, ready-to-use game components based on
// high-level descriptions. It generates both the .tscn scene and .gd script.
import * as fs from "fs";
import * as path from "path";
import { createScene } from "./create_scene.js";
import { addNode } from "./add_node.js";
import { parseTscnFile } from "../../parsers/tscn-parser.js";
import { writeSceneToFile } from "../../writers/tscn-writer.js";

export interface GenerateComponentArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Component type: "player", "enemy", "collectible", "hud", "health", "projectile", "spawner", "level" */
  component: string;
  /** Name for the generated component (defaults to component type name) */
  name?: string;
  /** Target directory within project (default: "scenes/" or "scripts/") */
  target_dir?: string;
}

const COMPONENT_TEMPLATES: Record<string, { description: string; sceneType: string; script: string; note: string }> = {
  player: {
    description: "2D player controller with movement, jump, and animation support",
    sceneType: "CharacterBody2D",
    script: `extends CharacterBody2D

@export var speed: float = 200.0
@export var jump_velocity: float = -400.0
@export var gravity: float = 980.0

func _physics_process(delta: float) -> void:
	# Apply gravity
	if not is_on_floor():
		velocity.y += gravity * delta

	# Horizontal movement
	var direction := Input.get_axis("ui_left", "ui_right")
	if direction:
		velocity.x = direction * speed
	else:
		velocity.x = move_toward(velocity.x, 0, speed * 0.2)

	# Jump
	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = jump_velocity

	move_and_slide()
`,
    note: "Requires Input Map actions: ui_left, ui_right, ui_accept (default Godot project settings)",
  },
  enemy: {
    description: "Basic 2D enemy AI with patrol and detection behavior",
    sceneType: "CharacterBody2D",
    script: `extends CharacterBody2D

@export var patrol_speed: float = 60.0
@export var chase_speed: float = 120.0
@export var detection_range: float = 200.0
@export var patrol_left: float = -100.0
@export var patrol_right: float = 100.0

var _start_position: Vector2
var _target: Node2D = null
var _moving_right: bool = true

func _ready() -> void:
	_start_position = position

func _physics_process(delta: float) -> void:
	# Look for player in detection range
	_target = _find_player()
	
	if _target:
		# Chase mode
		var direction = sign(_target.position.x - position.x)
		velocity.x = direction * chase_speed
		$Sprite2D.scale.x = sign(velocity.x) if velocity.x != 0 else $Sprite2D.scale.x
	else:
		# Patrol mode
		if position.x > _start_position.x + patrol_right:
			_moving_right = false
		elif position.x < _start_position.x + patrol_left:
			_moving_right = true
		velocity.x = patrol_speed * (1 if _moving_right else -1)
		$Sprite2D.scale.x = sign(velocity.x) if velocity.x != 0 else $Sprite2D.scale.x

	move_and_slide()

func _find_player() -> Node2D:
	var players = get_tree().get_nodes_in_group("player")
	for p in players:
		if global_position.distance_to(p.global_position) <= detection_range:
			return p
	return null
`,
    note: "Add player nodes to the 'player' group in Godot. Attach a CollisionShape2D and Sprite2D as children.",
  },
  collectible: {
    description: "Collectible item (coin, gem, powerup) with pickup detection",
    sceneType: "Area2D",
    script: `extends Area2D

signal collected(by: Node2D)

@export var value: int = 1
@export var pickup_sound: AudioStream = null
@export var destroy_on_pickup: bool = true

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		collected.emit(body)
		if destroy_on_pickup:
			queue_free()

func _on_area_entered(area: Area2D) -> void:
	var parent = area.get_parent()
	if parent and parent.is_in_group("player"):
		collected.emit(parent)
		if destroy_on_pickup:
			queue_free()
`,
    note: "Attach a CollisionShape2D as child. Add player node to the 'player' group.",
  },
  hud: {
    description: "Basic HUD overlay with score, health, and fuel display",
    sceneType: "CanvasLayer",
    script: `extends CanvasLayer

@onready var score_label: Label = $ScoreLabel
@onready var health_label: Label = $HealthLabel

var score: int = 0

func _ready() -> void:
	update_score(0)
	update_health(100)

func update_score(points: int) -> void:
	score += points
	score_label.text = "Score: " + str(score)

func update_health(value: float) -> void:
	health_label.text = "HP: " + str(ceili(value))
`,
    note: "Create Label children named ScoreLabel and HealthLabel. Adjust position in the scene.",
  },
  health: {
    description: "Health system with damage, healing, and death signal",
    sceneType: "Node",
    script: `extends Node

signal health_changed(current: float, max_health: float)
signal damaged(amount: float)
signal healed(amount: float)
signal died()

@export var max_health: float = 100.0
@export var invulnerable: bool = false
@export var invulnerability_time: float = 0.5

var current_health: float
var _invulnerable_timer: float = 0.0

func _ready() -> void:
	current_health = max_health

func _process(delta: float) -> void:
	if _invulnerable_timer > 0:
		_invulnerable_timer -= delta

func take_damage(amount: float) -> void:
	if invulnerable or _invulnerable_timer > 0:
		return
	current_health = max(0, current_health - amount)
	_invulnerable_timer = invulnerability_time
	damaged.emit(amount)
	health_changed.emit(current_health, max_health)
	if current_health <= 0:
		died.emit()

func heal(amount: float) -> void:
	current_health = min(max_health, current_health + amount)
	healed.emit(amount)
	health_changed.emit(current_health, max_health)
`,
    note: "Add as child of a CharacterBody2D. Connect died signal for game over logic.",
  },
  projectile: {
    description: "Projectile/bullet with direction, speed, and collision",
    sceneType: "Area2D",
    script: `extends Area2D

@export var speed: float = 500.0
@export var damage: float = 10.0
@export var lifetime: float = 2.0
@export var pierce: bool = false

var direction: Vector2 = Vector2.RIGHT
var _source: Node2D = null
var _timer: float = 0.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	_timer += delta
	if _timer >= lifetime:
		queue_free()

func _on_body_entered(body: Node2D) -> void:
	if body == _source:
		return
	if body.has_method("take_damage"):
		body.take_damage(damage)
	if not pierce:
		queue_free()

func _on_area_entered(area: Area2D) -> void:
	if area.get_parent() == _source:
		return
	if not pierce:
		queue_free()
`,
    note: "Add CollisionShape2D child. Set direction after instantiation. Connect to a Spawner or weapon node.",
  },
  spawner: {
    description: "Enemy/item spawner with wave control and timer",
    sceneType: "Node2D",
    script: `extends Node2D

signal spawned(instance: Node2D)

@export var scene_to_spawn: PackedScene = null
@export var spawn_interval: float = 3.0
@export var max_spawns: int = 0
@export var spawn_on_ready: bool = true
@export var random_offset: float = 50.0

var _spawn_count: int = 0
var _timer: float = 0.0

func _ready() -> void:
	if spawn_on_ready and scene_to_spawn:
		_do_spawn()

func _process(delta: float) -> void:
	_timer += delta
	if _timer >= spawn_interval and scene_to_spawn:
		if max_spawns == 0 or _spawn_count < max_spawns:
			_do_spawn()
			_timer = 0.0

func _do_spawn() -> void:
	var instance = scene_to_spawn.instantiate() as Node2D
	instance.position = position + Vector2(
		randf_range(-random_offset, random_offset),
		randf_range(-random_offset, random_offset)
	)
	get_parent().add_child(instance)
	instance.global_position = global_position
	_spawn_count += 1
	spawned.emit(instance)
`,
    note: "Set 'scene_to_spawn' in the inspector with a PackedScene (e.g., enemy.tscn).",
  },
  level: {
    description: "Empty level template with camera, world environment, and groups",
    sceneType: "Node2D",
    script: `extends Node2D

@export var level_name: String = "Level"
@export var next_level: String = ""

func _ready() -> void:
	# Setup audio
	var audio_player = AudioStreamPlayer2D.new()
	audio_player.name = "MusicPlayer"
	add_child(audio_player)
	
	_notify_ready()

func _notify_ready() -> void:
	# Notify any global managers
	if Engine.has_singleton("GameManager"):
		GameManager.on_level_loaded(level_name)

func get_spawn_points() -> Array[Node2D]:
	var points: Array[Node2D] = []
	for child in get_children():
		if child.is_in_group("spawn_point"):
			points.append(child)
	return points
`,
    note: "Add Camera2D as child for scrolling. Use spawn_point group for player start positions.",
  },
};

/**
 * Generate a complete game component with scene file and GDScript.
 */
export function generateComponent(args: GenerateComponentArgs): string {
  const { project_path, component, name, target_dir } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!component) throw new Error("component is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const template = COMPONENT_TEMPLATES[component];
  if (!template) {
    const available = Object.keys(COMPONENT_TEMPLATES).join(", ");
    throw new Error(`Unknown component type: "${component}". Available: ${available}`);
  }

  const baseName = name || component.charAt(0).toUpperCase() + component.slice(1);
  const sceneDir = target_dir ? path.resolve(project_path, target_dir) : path.join(project_path, "scenes");
  const scriptDir = target_dir ? path.resolve(project_path, target_dir.replace("scenes", "scripts")) : path.join(project_path, "scripts");

  // Create directories
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });

  const scenePath = path.join(sceneDir, `${baseName}.tscn`);
  const scriptPath = path.join(scriptDir, `${baseName}.gd`);

  // Check for conflicts
  if (fs.existsSync(scenePath) || fs.existsSync(scriptPath)) {
    throw new Error(
      `Component "${baseName}" already exists:\n` +
      `${fs.existsSync(scenePath) ? `  Scene: ${path.relative(project_path, scenePath)}\n` : ""}` +
      `${fs.existsSync(scriptPath) ? `  Script: ${path.relative(project_path, scriptPath)}\n` : ""}` +
      `Choose a different name or delete existing files first.`
    );
  }

  // Write script
  fs.writeFileSync(scriptPath, template.script, "utf-8");

  // Create scene with script attached
  createScene({
    scene_path: scenePath,
    root_node_name: baseName,
    root_node_type: template.sceneType,
    project_path,
  });

  // Attach script via scene modification
  const scene = parseTscnFile(scenePath);
  // Add ext_resource for the script
  const scriptResPath = `res://${path.relative(project_path, scriptPath).replace(/\\/g, "/")}`;
  scene.extResources.push({
    id: "1",
    type: "Script",
    path: scriptResPath,
  });
  if (scene.rootNode) {
    scene.rootNode.properties = scene.rootNode.properties || {};
    scene.rootNode.properties.script = `ExtResource("1")`;
  }
  writeSceneToFile(scene, scenePath);

  // For certain components, add child nodes
  if (component === "player" || component === "enemy") {
    // Add CollisionShape2D and Sprite2D as children
    addNode({ scene_path: scenePath, parent_node_name: baseName, node_type: "CollisionShape2D", node_name: "CollisionShape2D" });
    addNode({ scene_path: scenePath, parent_node_name: baseName, node_type: "Sprite2D", node_name: "Sprite2D" });
  }
  if (component === "collectible" || component === "projectile") {
    addNode({ scene_path: scenePath, parent_node_name: baseName, node_type: "CollisionShape2D", node_name: "CollisionShape2D" });
    addNode({ scene_path: scenePath, parent_node_name: baseName, node_type: "Sprite2D", node_name: "Sprite2D" });
  }
  if (component === "hud") {
    addNode({ scene_path: scenePath, parent_node_name: baseName, node_type: "Label", node_name: "ScoreLabel",
      properties: { text: "Score: 0", position: "Vector2(20, 20)" } });
    addNode({ scene_path: scenePath, parent_node_name: baseName, node_type: "Label", node_name: "HealthLabel",
      properties: { text: "HP: 100", position: "Vector2(20, 50)" } });
  }

  return [
    `Generated component: ${baseName}`,
    `  Type: ${component} (${template.description})`,
    `  Scene: ${path.relative(project_path, scenePath)}`,
    `  Script: ${path.relative(project_path, scriptPath)}`,
    `  Root: ${template.sceneType}`,
    "",
    template.note,
  ].join("\n");
}
