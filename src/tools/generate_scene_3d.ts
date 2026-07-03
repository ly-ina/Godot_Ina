// MCP Tool: generate_scene_3d — generates a basic 3D scene with terrain and player controller
// Output: scenes/Scene3D.tscn + scripts/player_3d.gd
import * as fs from "fs";
import * as path from "path";

export interface GenerateScene3DArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Scene name (default: Scene3D) */
  name?: string;
  /** Camera mode: fps (first person) or tps (third person, default) */
  camera?: "fps" | "tps";
}

export function generateScene3D(args: GenerateScene3DArgs): string {
  const { project_path, name = "Scene3D", camera = "tps" } = args;
  if (!project_path) throw new Error("project_path is required");

  const scenesDir = path.resolve(project_path, "scenes");
  const scriptsDir = path.resolve(project_path, "scripts");
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });

  const isFps = camera === "fps";
  const cameraScript = isFps
    ? `
extends CharacterBody3D
@export var spd: float = 5.0
@export var sens: float = 0.002
func _ready() -> void: Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
func _input(e: InputEvent) -> void:
	if e is InputEventMouseMotion: rotate_y(-e.relative.x * sens); $Head.rotate_x(-e.relative.y * sens); $Head.rotation.x = clampf($Head.rotation.x, -1.5, 1.5)
func _physics_process(d: float) -> void:
	if not is_on_floor(): velocity.y -= 9.8 * 3 * d
	var dir := Vector3(Input.get_axis("ui_left","ui_right"), 0, Input.get_axis("ui_up","ui_down")).rotated(Vector3.UP, rotation.y)
	velocity.x = dir.x * spd; velocity.z = dir.z * spd
	if Input.is_action_just_pressed("ui_accept") and is_on_floor(): velocity.y = 5.0
	move_and_slide()
`
    : `
extends CharacterBody3D
@export var spd: float = 5.0
var _cam: Camera3D
var _rot: Vector2
func _ready() -> void: _cam = $CamPivot/Camera3D; Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
func _input(e: InputEvent) -> void:
	if e is InputEventMouseMotion: _rot.y -= e.relative.x * 0.005; _rot.x -= e.relative.y * 0.005; _rot.x = clampf(_rot.x, -1.0, 0.5)
func _physics_process(d: float) -> void:
	if not is_on_floor(): velocity.y -= 9.8 * 3 * d
	var dir := Vector3(Input.get_axis("ui_left","ui_right"), 0, Input.get_axis("ui_up","ui_down")).rotated(Vector3.UP, _rot.y)
	velocity.x = dir.x * spd; velocity.z = dir.z * spd
	if Input.is_action_just_pressed("ui_accept") and is_on_floor(): velocity.y = 5.0
	$CamPivot.rotation.x = _rot.x
	move_and_slide()
`;

  const playerScript = isFps ? "player_3d_fps.gd" : "player_3d_tps.gd";
  fs.writeFileSync(path.join(scriptsDir, playerScript), cameraScript, "utf-8");

  // Build .tscn — NO blank lines between node declarations
  const tscn = [
    `[gd_scene load_steps=5 format=3 uid="uid://scene_3d_gen"]`,
    `[ext_resource type="Script" path="res://scripts/${playerScript}" id="1"]`,
    `[sub_resource type="BoxMesh" id="GroundMesh"]`,
    `size = Vector3(40, 1, 40)`,
    `[sub_resource type="BoxMesh" id="PlayerMesh"]`,
    `size = Vector3(0.8, 1.8, 0.8)`,
    `[sub_resource type="BoxShape3D" id="PlayerShape"]`,
    `size = Vector3(0.8, 1.8, 0.8)`,
    `[sub_resource type="CapsuleShape3D" id="CapsuleShape"]`,
    `radius = 0.4`,
    `height = 1.6`,
    `[node name="Main" type="Node3D"]`,
    `[node name="WorldEnvironment" type="WorldEnvironment" parent="."]`,
    `environment = SubResource("GroundMesh")`,
    `[node name="DirectionalLight" type="DirectionalLight3D" parent="."]`,
    `transform = Transform3D(1, 0, 0, 0, 0.707, -0.707, 0, 0.707, 0.707, 0, 0, 0)`,
    `[node name="Ground" type="StaticBody3D" parent="."]`,
    `position = Vector3(0, -0.5, 0)`,
    `[node name="GroundMesh" type="MeshInstance3D" parent="Ground"]`,
    `mesh = SubResource("GroundMesh")`,
    `[node name="GroundCol" type="CollisionShape3D" parent="Ground"]`,
    `shape = SubResource("PlayerShape")`,
    `[node name="Player" type="CharacterBody3D" parent="."]`,
    `position = Vector3(0, 2, 0)`,
    `script = ExtResource("1")`,
    `[node name="Mesh" type="MeshInstance3D" parent="Player"]`,
    `mesh = SubResource("PlayerMesh")`,
    `position = Vector3(0, 0.9, 0)`,
    `[node name="Collision" type="CollisionShape3D" parent="Player"]`,
    `shape = SubResource("CapsuleShape")`,
  ];

  // Add camera pivot (TPS only)
  if (!isFps) {
    tscn.push(
      `[node name="CamPivot" type="Node3D" parent="Player"]`,
      `position = Vector3(0, 1.5, 0)`,
      `[node name="Camera3D" type="Camera3D" parent="Player/CamPivot"]`,
      `position = Vector3(0, 0, 4)`,
    );
  } else {
    tscn.push(
      `[node name="Head" type="Node3D" parent="Player"]`,
      `position = Vector3(0, 1.5, 0)`,
      `[node name="Camera3D" type="Camera3D" parent="Player/Head"]`,
      `position = Vector3(0, 0, 0)`,
    );
  }

  fs.writeFileSync(path.join(scenesDir, `${name}.tscn`), tscn.join("\n"), "utf-8");

  return [
    `=== 3D Scene Generated ===`,
    `  Scene: scenes/${name}.tscn`,
    `  Script: scripts/${playerScript}`,
    `  Camera: ${camera.toUpperCase()}`,
    ``,
    `Controls: WASD move, Space jump, Mouse look`,
    `Open: godot --path <project> --scene res://scenes/${name}.tscn`,
  ].join("\n");
}
