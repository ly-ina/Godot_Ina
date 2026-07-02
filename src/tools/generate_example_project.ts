// MCP Tool: generate_example_project — create complete example Godot projects
// Generates ready-to-run game projects for common genres.
import * as fs from "fs";
import * as path from "path";
import { initProject } from "./init_project.js";

export interface GenerateExampleProjectArgs {
  /** Path where the example project should be created */
  output_path: string;
  /** Example project type */
  template: "platformer2d" | "rpg_dialogue" | "topdown_shooter" | "minimal_fps";
  /** Project name (defaults to template name) */
  project_name?: string;
}

const TEMPLATES: Record<string, { name: string; desc: string; resolution: [number, number]; player_type: string }> = {
  platformer2d: { name: "2D Platformer", desc: "Complete 2D platformer with player, enemies, coins, and level", resolution: [1152, 648], player_type: "CharacterBody2D" },
  rpg_dialogue: { name: "RPG Dialogue Demo", desc: "Dialogue system with NPCs, branching choices, and quest tracking", resolution: [1152, 648], player_type: "CharacterBody2D" },
  topdown_shooter: { name: "Top-Down Shooter", desc: "Shooter with WASD movement, aiming, shooting, and enemy waves", resolution: [1152, 648], player_type: "CharacterBody2D" },
  minimal_fps: { name: "Minimal FPS", desc: "First-person 3D with mouse look, shooting, and target practice", resolution: [1920, 1080], player_type: "CharacterBody3D" },
};

/**
 * Generate a complete, ready-to-run example Godot project.
 */
export function generateExampleProject(args: GenerateExampleProjectArgs): string {
  const { output_path, template, project_name } = args;

  if (!output_path) throw new Error("output_path is required");
  if (!template) throw new Error("template is required");
  if (fs.existsSync(output_path)) throw new Error(`Output path already exists: ${output_path}`);

  const tpl = TEMPLATES[template];
  if (!tpl) throw new Error(`Unknown template: "${template}". Available: ${Object.keys(TEMPLATES).join(", ")}`);

  const name = project_name || tpl.name.replace(/\s+/g, "");

  // Initialize basic project structure
  initProject({
    project_path: output_path,
    project_name: name,
    width: tpl.resolution[0],
    height: tpl.resolution[1],
  });

  const scenesDir = path.join(output_path, "scenes");
  const scriptsDir = path.join(output_path, "scripts");

  switch (template) {
    case "platformer2d": return generatePlatformer2D(output_path, scenesDir, scriptsDir, name);
    case "rpg_dialogue": return generateRpgDialogue(output_path, scenesDir, scriptsDir, name);
    case "topdown_shooter": return generateTopdownShooter(output_path, scenesDir, scriptsDir, name);
    case "minimal_fps": return generateMinimalFps(output_path, scenesDir, scriptsDir, name);
    default: throw new Error("Unknown template");
  }
}

function generatePlatformer2D(root: string, scenesDir: string, scriptsDir: string, name: string): string {
  // Player script
  const playerGd = [
    `extends CharacterBody2D`,
    ``,
    `@export var speed: float = 300.0`,
    `@export var jump_velocity: float = -500.0`,
    `@export var gravity: float = 1200.0`,
    `@export var health: int = 3`,
    ``,
    `var _coins: int = 0`,
    ``,
    `func _physics_process(delta: float) -> void:`,
    `\tif not is_on_floor():`,
    `\t\tvelocity.y += gravity * delta`,
    `\tvar dir := Input.get_axis("ui_left", "ui_right")`,
    `\tif dir:`,
    `\t\tvelocity.x = dir * speed`,
    `\t\t$Sprite2D.scale.x = dir`,
    `\telse:`,
    `\t\tvelocity.x = move_toward(velocity.x, 0, speed)`,
    `\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():`,
    `\t\tvelocity.y = jump_velocity`,
    `\tmove_and_slide()`,
    ``,
    `func collect_coin() -> void:`,
    `\t_coins += 1`,
    `\tprint("Coins: ", _coins)`,
    ``,
    `func take_damage() -> void:`,
    `\thealth -= 1`,
    `\tif health <= 0:`,
    `\t\tqueue_free()`,
    `\t\tget_tree().reload_current_scene()`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "player.gd"), playerGd, "utf-8");

  // Enemy script
  const enemyGd = [
    `extends CharacterBody2D`,
    ``,
    `@export var speed: float = 50.0`,
    `@export var patrol_range: float = 100.0`,
    ``,
    `var _start_x: float`,
    `var _dir: float = 1.0`,
    ``,
    `func _ready() -> void:`,
    `\t_start_x = position.x`,
    ``,
    `func _physics_process(_delta: float) -> void:`,
    `\tvelocity.x = _dir * speed`,
    `\tif position.x > _start_x + patrol_range: _dir = -1`,
    `\telif position.x < _start_x - patrol_range: _dir = 1`,
    `\t$Sprite2D.scale.x = _dir`,
    `\tmove_and_slide()`,
    ``,
    `func _on_body_entered(body: Node2D) -> void:`,
    `\tif body.has_method("take_damage"):`,
    `\t\tbody.take_damage()`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "enemy.gd"), enemyGd, "utf-8");

  // Coin script
  const coinGd = [
    `extends Area2D`,
    ``,
    `@export var value: int = 1`,
    ``,
    `func _ready() -> void:`,
    `\tbody_entered.connect(_on_body_entered)`,
    ``,
    `func _on_body_entered(body: Node2D) -> void:`,
    `\tif body.has_method("collect_coin"):`,
    `\t\tbody.collect_coin()`,
    `\t\tqueue_free()`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "coin.gd"), coinGd, "utf-8");

  // Main level scene
  const levelPath = path.join(scenesDir, "Level1.tscn");
  const level = [
    `[gd_scene load_steps=4 format=3]`,
    ``,
    `[ext_resource type="Script" path="res://scripts/player.gd" id="1"]`,
    `[ext_resource type="Script" path="res://scripts/enemy.gd" id="2"]`,
    `[ext_resource type="Script" path="res://scripts/coin.gd" id="3"]`,
    ``,
    `[node name="Level" type="Node2D"]`,
    ``,
    `[node name="Player" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("1")`,
    `position = Vector2(100, 300)`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Player"]`,
    `scale = Vector2(3, 3)`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]`,
    `shape = SubResource("rect")`,
    ``,
    `[node name="Camera2D" type="Camera2D" parent="Player"]`,
    ``,
    `[node name="Enemy" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("2")`,
    `position = Vector2(500, 300)`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Enemy"]`,
    `scale = Vector2(3, 3)`,
    `modulate = Color(1, 0, 0)`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Enemy"]`,
    `shape = SubResource("rect")`,
    ``,
    `[node name="Coin" type="Area2D" parent="."]`,
    `script = ExtResource("3")`,
    `position = Vector2(300, 250)`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Coin"]`,
    `scale = Vector2(2, 2)`,
    `modulate = Color(1, 1, 0)`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Coin"]`,
    `shape = SubResource("rect")`,
    ``,
    `[node name="Ground" type="StaticBody2D" parent="."]`,
    `position = Vector2(600, 500)`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Ground"]`,
    `shape = SubResource("floor")`,
    ``,
    `[sub_resource type="RectangleShape2D" id="rect"]`,
    `size = Vector2(32, 32)`,
    ``,
    `[sub_resource type="RectangleShape2D" id="floor"]`,
    `size = Vector2(1600, 32)`,
    ``,
  ].join("\n");
  fs.writeFileSync(levelPath, level, "utf-8");

  // Update project.godot to point to Level1
  const projectFile = path.join(root, "project.godot");
  const projectContent = fs.readFileSync(projectFile, "utf-8");
  const updated = projectContent.replace(/run\/main_scene="res:\/\/scenes\/Main\.tscn"/, `run/main_scene="res://scenes/Level1.tscn"`);
  fs.writeFileSync(projectFile, updated, "utf-8");

  return [
    `Generated Example: ${name} — 2D Platformer`,
    `  Path: ${root}`,
    `  Main scene: scenes/Level1.tscn`,
    `  Scripts: player.gd, enemy.gd, coin.gd`,
    `  Controls: Arrow keys + Space to jump`,
    `  Features: player movement, patrol enemy, collectible coins`,
    `  Ready to run: open in Godot and play.`,
  ].join("\n");
}

function generateRpgDialogue(root: string, scenesDir: string, scriptsDir: string, name: string): string {
  // Dialogue system
  const dialogueGd = [
    `# Dialogue System — branching conversation with NPCs`,
    `class_name DialogueSystem`,
    `extends Control`,
    ``,
    `signal dialogue_started(npc_name: String)`,
    `signal dialogue_ended(npc_name: String)`,
    `signal choice_made(choice_index: int, choice_text: String)`,
    ``,
    `@onready var name_label: Label = $NameLabel`,
    `@onready var text_label: RichTextLabel = $TextLabel`,
    `@onready var choices_container: VBoxContainer = $Choices`,
    ``,
    `var _current_npc: String = ""`,
    `var _current_node: Dictionary = {}`,
    `var _dialogues: Dictionary = {}`,
    `var _flags: Dictionary = {}`,
    ``,
    `func _ready() -> void:`,
    `\thide()`,
    ``,
    `func load_dialogue(json_path: String) -> void:`,
    `\tvar file := FileAccess.open(json_path, FileAccess.READ)`,
    `\tif file:`,
    `\t\t_dialogues = JSON.parse_string(file.get_as_text())`,
    ``,
    `func start_dialogue(npc_name: String, start_node: String = "start") -> void:`,
    `\tif not _dialogues.has(npc_name): return`,
    `\t_current_npc = npc_name`,
    `\t_show_node(start_node)`,
    `\tshow()`,
    `\tdialogue_started.emit(npc_name)`,
    ``,
    `func _show_node(node_id: String) -> void:`,
    `\tvar npc_data = _dialogues[_current_npc]`,
    `\tif not npc_data.has(node_id):`,
    `\t\tend_dialogue()`,
    `\t\treturn`,
    `\t_current_node = npc_data[node_id]`,
    `\t# Clear choices`,
    `\tfor c in choices_container.get_children():`,
    `\t\tc.queue_free()`,
    `\t# Show text`,
    `\tname_label.text = _current_npc`,
    `\ttext_label.text = _current_node.get("text", "...")`,
    `\t# Show choices`,
    `\tvar choices = _current_node.get("choices", [])`,
    `\tif choices.size() == 0:`,
    `\t\t_add_choice("[Continue]", "next", "")`,
    `\telse:`,
    `\t\tfor i in choices.size():`,
    `\t\t\tvar c = choices[i]`,
    `\t\t\tvar condition = c.get("condition", "")`,
    `\t\t\tif condition == "" or _check_condition(condition):`,
    `\t\t\t\t_add_choice(c.text, "goto", c.next_node, i)`,
    ``,
    `func _add_choice(text: String, action: String, target: String, index: int = -1) -> void:`,
    `\tvar btn := Button.new()`,
    `\tbtn.text = text`,
    `\tbtn.pressed.connect(func():`,
    `\t\tchoice_made.emit(index, text)`,
    `\t\tif action == "next":`,
    `\t\t\tvar next = _current_node.get("next", "")`,
    `\t\t\tif next: _show_node(next)`,
    `\t\t\telse: end_dialogue()`,
    `\t\telif action == "goto":`,
    `\t\t\tif _current_node.has("set_flag"):`,
    `\t\t\t\t_flags[_current_node.set_flag] = true`,
    `\t\t\t_show_node(target)`,
    `\t)`,
    `\tchoices_container.add_child(btn)`,
    ``,
    `func _check_condition(cond: String) -> bool:`,
    `\treturn _flags.get(cond, false)`,
    ``,
    `func end_dialogue() -> void:`,
    `\thide()`,
    `\tdialogue_ended.emit(_current_npc)`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "dialogue_system.gd"), dialogueGd, "utf-8");

  // NPC script
  const npcGd = [
    `extends CharacterBody2D`,
    ``,
    `@export var npc_name: String = "Villager"`,
    `@export var dialogue_file: String = "res://data/dialogue.json"`,
    ``,
    `var _player_near: bool = false`,
    `var _dialogue: DialogueSystem = null`,
    ``,
    `func _ready() -> void:`,
    `\t_dialogue = get_tree().root.find_child("DialogueSystem", true, false)`,
    ``,
    `func _process(_delta: float) -> void:`,
    `\tif _player_near and Input.is_action_just_pressed("ui_accept") and _dialogue:`,
    `\t\t_dialogue.start_dialogue(npc_name)`,
    ``,
    `func _on_body_entered(body: Node2D) -> void:`,
    `\tif body.is_in_group("player"):`,
    `\t\t_player_near = true`,
    ``,
    `func _on_body_exited(body: Node2D) -> void:`,
    `\tif body.is_in_group("player"):`,
    `\t\t_player_near = false`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "npc.gd"), npcGd, "utf-8");

  // Dialogue data
  const dialogueDir = path.join(root, "data");
  if (!fs.existsSync(dialogueDir)) fs.mkdirSync(dialogueDir, { recursive: true });
  const dialogueJson = JSON.stringify({
    "Elder": {
      "start": {
        "text": "Welcome, traveler. Our village needs your help.",
        "choices": [
          { "text": "What's the problem?", "next_node": "quest_info" },
          { "text": "I'm just passing through.", "next_node": "bye" },
        ],
      },
      "quest_info": {
        "text": "Goblins have been stealing our crops. Clear 3 goblin camps and I'll reward you.",
        "choices": [
          { "text": "I'll do it!", "next_node": "quest_started", "set_flag": "quest_goblins" },
          { "text": "Sounds dangerous. Goodbye.", "next_node": "bye" },
        ],
      },
      "quest_started": {
        "text": "Excellent! Look for camps north of the village.",
        "next": "end",
      },
      "bye": {
        "text": "Safe travels. Come back if you change your mind.",
        "next": "end",
      },
      "end": { "text": "Farewell, traveler.", "next": "" },
    },
    "Shopkeeper": {
      "start": {
        "text": "Welcome to my shop! I've got the finest goods in town.",
        "choices": [
          { "text": "Show me your wares.", "next_node": "shop" },
          { "text": "Maybe later.", "next_node": "end" },
        ],
      },
      "shop": {
        "text": "I have potions, weapons, and maps. Come back when you have gold!",
        "condition": "quest_goblins",
        "choices": [
          { "text": "Thanks!", "next_node": "end" },
        ],
      },
      "end": { "text": "Come again!", "next": "" },
    },
  }, null, 2);
  fs.writeFileSync(path.join(dialogueDir, "dialogue.json"), dialogueJson, "utf-8");

  // Village scene
  const villagePath = path.join(scenesDir, "Village.tscn");
  const village = [
    `[gd_scene load_steps=3 format=3]`,
    `[ext_resource type="Script" path="res://scripts/npc.gd" id="1"]`,
    `[ext_resource type="Script" path="res://scripts/player.gd" id="2"]`,
    ``,
    `[node name="Village" type="Node2D"]`,
    ``,
    `[node name="Player" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("2")`,
    `position = Vector2(400, 300)`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Player"]`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]`,
    ``,
    `[node name="Camera2D" type="Camera2D" parent="Player"]`,
    ``,
    `[node name="Elder" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("1")`,
    `position = Vector2(600, 300)`,
    `npc_name = "Elder"`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Elder"]`,
    `modulate = Color(0, 1, 0)`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Elder"]`,
    ``,
    `[node name="Shopkeeper" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("1")`,
    `position = Vector2(200, 300)`,
    `npc_name = "Shopkeeper"`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Shopkeeper"]`,
    `modulate = Color(0, 0, 1)`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Shopkeeper"]`,
    `shape = SubResource("rect")`,
    ``,
    `[sub_resource type="RectangleShape2D" id="rect"]`,
    `size = Vector2(32, 32)`,
    ``,
  ].join("\n");
  fs.writeFileSync(villagePath, village, "utf-8");

  // Update project.godot
  const projectFile = path.join(root, "project.godot");
  const projectContent = fs.readFileSync(projectFile, "utf-8");
  const updated = projectContent.replace(/run\/main_scene="res:\/\/scenes\/Main\.tscn"/, `run/main_scene="res://scenes/Village.tscn"`);
  fs.writeFileSync(projectFile, updated, "utf-8");

  return [
    `Generated Example: ${name} — RPG Dialogue Demo`,
    `  Path: ${root}`,
    `  Main scene: scenes/Village.tscn`,
    `  Scripts: dialogue_system.gd, npc.gd`,
    `  Data: data/dialogue.json (branching dialogue tree)`,
    `  Features: branching dialogues, quest flags, conditions`,
    `  Ready to run: open in Godot and talk to NPCs (Space).`,
  ].join("\n");
}

function generateTopdownShooter(root: string, scenesDir: string, scriptsDir: string, name: string): string {
  // Reuse the player script with WASD aim
  const playerGd = [
    `extends CharacterBody2D`,
    ``,
    `@export var speed: float = 300.0`,
    `@export var bullet_scene: PackedScene = null`,
    `@export var fire_rate: float = 0.2`,
    ``,
    `var _fire_cooldown: float = 0.0`,
    ``,
    `func _process(delta: float) -> void:`,
    `\t_fire_cooldown -= delta`,
    `\t# Aim toward mouse`,
    `\tvar mouse := get_global_mouse_position()`,
    `\t$Sprite2D.look_at(mouse)`,
    `\t# Shoot`,
    `\tif Input.is_action_pressed("ui_accept") and _fire_cooldown <= 0:`,
    `\t\t_shoot(mouse)`,
    `\t\t_fire_cooldown = fire_rate`,
    ``,
    `func _physics_process(_delta: float) -> void:`,
    `\tvar dir := Vector2.ZERO`,
    `\tif Input.is_action_pressed("ui_left"): dir.x -= 1`,
    `\tif Input.is_action_pressed("ui_right"): dir.x += 1`,
    `\tif Input.is_action_pressed("ui_up"): dir.y -= 1`,
    `\tif Input.is_action_pressed("ui_down"): dir.y += 1`,
    `\tvelocity = dir.normalized() * speed`,
    `\tmove_and_slide()`,
    ``,
    `func _shoot(target: Vector2) -> void:`,
    `\tif not bullet_scene: return`,
    `\tvar bullet := bullet_scene.instantiate()`,
    `\tbullet.global_position = global_position`,
    `\tbullet.direction = (target - global_position).normalized()`,
    `\tget_parent().add_child(bullet)`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "player.gd"), playerGd, "utf-8");

  // Bullet
  const bulletGd = [
    `extends Area2D`,
    ``,
    `@export var speed: float = 600.0`,
    `@export var damage: float = 1.0`,
    `@export var lifetime: float = 2.0`,
    ``,
    `var direction: Vector2 = Vector2.RIGHT`,
    `var _timer: float = 0.0`,
    ``,
    `func _ready() -> void:`,
    `\tbody_entered.connect(_on_hit)`,
    ``,
    `func _physics_process(delta: float) -> void:`,
    `\tglobal_position += direction * speed * delta`,
    `\t_timer += delta`,
    `\tif _timer > lifetime: queue_free()`,
    ``,
    `func _on_hit(body: Node2D) -> void:`,
    `\tif body.has_method("take_damage"):`,
    `\t\tbody.take_damage(damage)`,
    `\tqueue_free()`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "bullet.gd"), bulletGd, "utf-8");

  // Enemy spawner
  const spawnerGd = [
    `extends Node2D`,
    ``,
    `@export var enemy_scene: PackedScene = null`,
    `@export var spawn_interval: float = 2.0`,
    `@export var max_enemies: int = 10`,
    ``,
    `var _timer: float = 0.0`,
    `var _wave: int = 0`,
    ``,
    `func _process(delta: float) -> void:`,
    `\t_timer += delta`,
    `\tvar enemies := get_tree().get_nodes_in_group("enemy")`,
    `\tif _timer >= spawn_interval and enemies.size() < max_enemies:`,
    `\t\t_spawn_enemy()`,
    `\t\t_timer = 0.0`,
    ``,
    `func _spawn_enemy() -> void:`,
    `\tif not enemy_scene: return`,
    `\tvar e := enemy_scene.instantiate()`,
    `\tvar viewport := get_viewport_rect()`,
    `\te.position = Vector2(randf_range(50, viewport.size.x - 50), randf_range(50, viewport.size.y - 50))`,
    `\tadd_child(e)`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "spawner.gd"), spawnerGd, "utf-8");

  const arenaPath = path.join(scenesDir, "Arena.tscn");
  const arena = [
    `[gd_scene load_steps=4 format=3]`,
    `[ext_resource type="Script" path="res://scripts/player.gd" id="1"]`,
    `[ext_resource type="Script" path="res://scripts/bullet.gd" id="2"]`,
    `[ext_resource type="Script" path="res://scripts/spawner.gd" id="3"]`,
    ``,
    `[node name="Arena" type="Node2D"]`,
    ``,
    `[node name="Player" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("1")`,
    `position = Vector2(500, 400)`,
    `bullet_scene = ExtResource("2")`,
    ``,
    `[node name="Sprite2D" type="Sprite2D" parent="Player"]`,
    ``,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]`,
    `shape = SubResource("rect")`,
    ``,
    `[node name="Camera2D" type="Camera2D" parent="Player"]`,
    ``,
    `[node name="Spawner" type="Node2D" parent="."]`,
    `script = ExtResource("3")`,
    ``,
    `[sub_resource type="RectangleShape2D" id="rect"]`,
    `size = Vector2(32, 32)`,
    ``,
  ].join("\n");
  fs.writeFileSync(arenaPath, arena, "utf-8");

  const projectFile = path.join(root, "project.godot");
  const projectContent = fs.readFileSync(projectFile, "utf-8");
  const updated = projectContent.replace(/run\/main_scene="res:\/\/scenes\/Main\.tscn"/, `run/main_scene="res://scenes/Arena.tscn"`);
  fs.writeFileSync(projectFile, updated, "utf-8");

  return [
    `Generated Example: ${name} — Top-Down Shooter`,
    `  Path: ${root}`,
    `  Main scene: scenes/Arena.tscn`,
    `  Scripts: player.gd, bullet.gd, spawner.gd`,
    `  Controls: WASD move, Space/Click to shoot, Mouse aim`,
    `  Features: mouse aiming, bullets, enemy waves`,
    `  Ready to run: open in Godot and play.`,
  ].join("\n");
}

function generateMinimalFps(root: string, scenesDir: string, scriptsDir: string, name: string): string {
  const playerGd = [
    `extends CharacterBody3D`,
    ``,
    `@export var mouse_sensitivity: float = 0.002`,
    `@export var walk_speed: float = 5.0`,
    `@export var sprint_speed: float = 8.0`,
    ``,
    `@onready var head: Node3D = $Head`,
    `@onready var camera: Camera3D = $Head/Camera3D`,
    ``,
    `func _ready() -> void:`,
    `\tInput.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)`,
    ``,
    `func _input(event: InputEvent) -> void:`,
    `\tif event is InputEventMouseMotion:`,
    `\t\trotate_y(-event.relative.x * mouse_sensitivity)`,
    `\t\thead.rotate_x(-event.relative.y * mouse_sensitivity)`,
    `\t\thead.rotation.x = clamp(head.rotation.x, -1.5, 1.5)`,
    `\tif event.is_action_pressed("ui_cancel"):`,
    `\t\tInput.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)`,
    ``,
    `func _physics_process(_delta: float) -> void:`,
    `\tvar dir := Vector3.ZERO`,
    `\tif Input.is_action_pressed("ui_left"): dir.x -= 1`,
    `\tif Input.is_action_pressed("ui_right"): dir.x += 1`,
    `\tif Input.is_action_pressed("ui_up"): dir.z -= 1`,
    `\tif Input.is_action_pressed("ui_down"): dir.z += 1`,
    `\tdir = dir.rotated(Vector3.UP, rotation.y).normalized()`,
    `\tvar spd := sprint_speed if Input.is_action_pressed("ui_accept") else walk_speed`,
    `\tvelocity = dir * spd`,
    `\tmove_and_slide()`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptsDir, "player_fps.gd"), playerGd, "utf-8");

  const levelPath = path.join(scenesDir, "FPS_Level.tscn");
  const level = [
    `[gd_scene load_steps=2 format=3]`,
    `[ext_resource type="Script" path="res://scripts/player_fps.gd" id="1"]`,
    ``,
    `[node name="FPSLevel" type="Node3D"]`,
    ``,
    `[node name="Player" type="CharacterBody3D" parent="."]`,
    `script = ExtResource("1")`,
    `position = Vector3(0, 1, 0)`,
    ``,
    `[node name="Head" type="Node3D" parent="Player"]`,
    ``,
    `[node name="Camera3D" type="Camera3D" parent="Player/Head"]`,
    `current = true`,
    ``,
    `[node name="CollisionShape3D" type="CollisionShape3D" parent="Player"]`,
    `shape = SubResource("capsule")`,
    ``,
    `[node name="Ground" type="StaticBody3D" parent="."]`,
    `position = Vector3(0, -1, 0)`,
    ``,
    `[node name="CollisionShape3D" type="CollisionShape3D" parent="Ground"]`,
    `shape = SubResource("floor")`,
    ``,
    `[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]`,
    `rotation = Vector3(-0.7, 0.8, 0)`,
    ``,
    `[node name="WorldEnvironment" type="WorldEnvironment" parent="."]`,
    ``,
    `[sub_resource type="CapsuleShape3D" id="capsule"]`,
    `height = 2.0`,
    `radius = 0.5`,
    ``,
    `[sub_resource type="BoxShape3D" id="floor"]`,
    `size = Vector3(100, 1, 100)`,
    ``,
  ].join("\n");
  fs.writeFileSync(levelPath, level, "utf-8");

  const projectFile = path.join(root, "project.godot");
  const projectContent = fs.readFileSync(projectFile, "utf-8");
  const updated = projectContent.replace(/run\/main_scene="res:\/\/scenes\/Main\.tscn"/, `run/main_scene="res://scenes/FPS_Level.tscn"`);
  fs.writeFileSync(projectFile, updated, "utf-8");

  return [
    `Generated Example: ${name} — Minimal FPS`,
    `  Path: ${root}`,
    `  Main scene: scenes/FPS_Level.tscn`,
    `  Scripts: player_fps.gd`,
    `  Controls: WASD move, Shift sprint, Mouse look, Esc unlock cursor`,
    `  Features: mouse look, 3D movement, sprint`,
    `  Ready to run: open in Godot and play.`,
  ].join("\n");
}
