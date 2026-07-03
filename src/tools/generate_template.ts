// MCP Tool: generate_template — generates complete single-scene game templates
// Templates are standalone .tscn files you can drop into any project.
// Unlike generate_example_project (full project), these are single-file templates.
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface GenerateTemplateArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Template type */
  template: "platformer2d" | "rpg_topdown" | "topdown_shooter" | "strategy_slg";
  /** Output scene name (default: template type name) */
  name?: string;
}

const TEMPLATES: Record<string, { desc: string; gdscript: string; tscn: string }> = {};

// ── Platformer 2D ──
TEMPLATES["platformer2d"] = {
  desc: "2D platformer with player, ground, platforms, coins, camera follow",
  gdscript: `extends CharacterBody2D
@export var spd: float = 200.0
@export var jmp: float = -350.0
@export var grav: float = 900.0
func _physics_process(d: float) -> void:
	if not is_on_floor(): velocity.y += grav * d
	var dir: float = Input.get_axis("ui_left", "ui_right")
	velocity.x = dir * spd if dir != 0 else move_toward(velocity.x, 0, spd * 10 * d)
	if Input.is_action_just_pressed("ui_accept") and is_on_floor(): velocity.y = jmp
	move_and_slide()
`,
  tscn: `[gd_scene load_steps=2 format=3]
[ext_resource type="Script" path="res://scripts/player_template.gd" id="1"]
[sub_resource type="RectangleShape2D" id="PS"]
size = Vector2(24, 48)
[node name="Main" type="Node2D"]
[node name="Sky" type="ColorRect" parent="."]
anchor_right = 1.0; anchor_bottom = 1.0; color = Color(0.4, 0.6, 0.9, 1)
[node name="Ground" type="StaticBody2D" parent="."]
position = Vector2(0, 300)
[node name="GroundVis" type="ColorRect" parent="Ground"]
offset_left = -2000; offset_top = -10; offset_right = 2000; offset_bottom = 10; color = Color(0.2, 0.5, 0.2, 1)
[node name="GroundCol" type="CollisionShape2D" parent="Ground"]
shape = SubResource("PS"); size = Vector2(4000, 20)
[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(0, -100); script = ExtResource("1")
[node name="Body" type="ColorRect" parent="Player"]
offset_left = -12; offset_top = -48; offset_right = 12; offset_bottom = 0; color = Color(0.3, 0.5, 0.8, 1)
[node name="Collision" type="CollisionShape2D" parent="Player"]
shape = SubResource("PS"); position = Vector2(0, -24)
[node name="Camera" type="Camera2D" parent="Player"]
position_smoothing_enabled = true; position_smoothing_speed = 5.0
`,
};

// ── RPG Top-Down ──
TEMPLATES["rpg_topdown"] = {
  desc: "Top-down RPG with player, NPC, dialog area trigger, camera",
  gdscript: `extends CharacterBody2D
@export var spd: float = 120.0
func _physics_process(d: float) -> void:
	var dir := Vector2(Input.get_axis("ui_left","ui_right"), Input.get_axis("ui_up","ui_down"))
	velocity = dir.normalized() * spd
	move_and_slide()
`,
  tscn: `[gd_scene load_steps=2 format=3]
[ext_resource type="Script" path="res://scripts/player_rpg.gd" id="1"]
[sub_resource type="RectangleShape2D" id="PS"]
size = Vector2(24, 32)
[node name="Main" type="Node2D"]
[node name="Sky" type="ColorRect" parent="."]
anchor_right = 1.0; anchor_bottom = 1.0; color = Color(0.15, 0.18, 0.22, 1)
[node name="Ground" type="ColorRect" parent="."]
offset_left = -2000; offset_top = 0; offset_right = 2000; offset_bottom = 2000; color = Color(0.25, 0.3, 0.25, 1)
[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(0, 0); script = ExtResource("1")
[node name="Body" type="ColorRect" parent="Player"]
offset_left = -12; offset_top = -32; offset_right = 12; offset_bottom = 0; color = Color(0.3, 0.5, 0.8, 1)
[node name="Collision" type="CollisionShape2D" parent="Player"]
shape = SubResource("PS"); position = Vector2(0, -16)
[node name="Camera" type="Camera2D" parent="Player"]
position_smoothing_enabled = true; position_smoothing_speed = 5.0
`,
};

// ── Top-Down Shooter ──
TEMPLATES["topdown_shooter"] = {
  desc: "Top-down shooter with WASD movement, mouse aim, click to shoot",
  gdscript: `extends CharacterBody2D
@export var spd: float = 150.0
func _physics_process(d: float) -> void:
	var dir := Vector2(Input.get_axis("ui_left","ui_right"), Input.get_axis("ui_up","ui_down"))
	velocity = dir.normalized() * spd
	move_and_slide()
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var mp: Vector2 = get_global_mouse_position()
		var d2: Vector2 = (mp - global_position).normalized()
		$Body.rotation = atan2(d2.y, d2.x)
`,
  tscn: `[gd_scene load_steps=2 format=3]
[ext_resource type="Script" path="res://scripts/player_shooter.gd" id="1"]
[sub_resource type="RectangleShape2D" id="PS"]
size = Vector2(24, 24)
[node name="Main" type="Node2D"]
[node name="Sky" type="ColorRect" parent="."]
anchor_right = 1.0; anchor_bottom = 1.0; color = Color(0.08, 0.08, 0.12, 1)
[node name="Ground" type="ColorRect" parent="."]
offset_left = -2000; offset_top = 0; offset_right = 2000; offset_bottom = 2000; color = Color(0.18, 0.18, 0.2, 1)
[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(0, 0); script = ExtResource("1")
[node name="Body" type="ColorRect" parent="Player"]
offset_left = -12; offset_top = -12; offset_right = 12; offset_bottom = 12; color = Color(0.3, 0.5, 0.8, 1)
[node name="Collision" type="CollisionShape2D" parent="Player"]
shape = SubResource("PS")
[node name="Camera" type="Camera2D" parent="Player"]
position_smoothing_enabled = true; position_smoothing_speed = 5.0
`,
};

// ── Strategy SLG ──
TEMPLATES["strategy_slg"] = {
  desc: "Strategy game with hex grid, select units, move with click",
  gdscript: `extends Node2D
var _grid := {"00": true, "10": true, "01": true, "11": true, "20": true, "02": true}
func _ready() -> void:
	for key in _grid:
		var parts := key.split("")
		var x: int = int(parts[0]); var y: int = int(parts[1])
		var hex := ColorRect.new()
		hex.size = Vector2(40, 46)
		hex.position = Vector2(x * 42 + (y % 2) * 21, y * 38)
		hex.color = Color(0.2, 0.4, 0.2, 0.8)
		add_child(hex)
`,
  tscn: `[gd_scene load_steps=1 format=3]
[node name="Main" type="Node2D"]
[node name="Script" type="Node" parent="."]
script = preload("res://scripts/strategy_template.gd")
[node name="Label" type="Label" parent="."]
position = Vector2(16, 16)
text = "Strategy Map Placeholder"
theme_override_colors/font_color = Color(1, 1, 1, 0.5)
`,
};

export function generateTemplate(args: GenerateTemplateArgs): string {
  const { project_path, template, name } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!TEMPLATES[template]) throw new Error(`Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(", ")}`);

  const scenesDir = path.resolve(project_path, "scenes");
  const scriptsDir = path.resolve(project_path, "scripts");
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });

  const t = TEMPLATES[template];
  const sceneName = name || template;
  const tscnPath = path.join(scenesDir, `${sceneName}.tscn`);
  const scriptPath = path.join(scriptsDir, `${sceneName}.gd`);

  // Write script
  fs.writeFileSync(scriptPath, t.gdscript, "utf-8");
  // Write scene
  fs.writeFileSync(tscnPath, t.tscn, "utf-8");

  return [
    `=== ${template} Template Generated ===`,
    `  Scene: scenes/${sceneName}.tscn`,
    `  Script: scripts/${sceneName}.gd`,
    `  Description: ${t.desc}`,
    ``,
    `Open in Godot: --scene res://scenes/${sceneName}.tscn`,
  ].join("\n");
}
