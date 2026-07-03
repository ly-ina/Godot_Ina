// MCP Tool: generate_minecraft_demo — generates a complete, working 2D Minecraft-like game
// Colors and sizes from shared theme config for consistency with other generators.
import * as fs from "fs";
import * as path from "path";
import { initProject } from "../init_project.js";
import { PLAYER, WORLD, SKY, GROUND } from "../../config/game-theme.js";

export interface GenerateMinecraftDemoArgs {
  project_path: string;
}

export function generateMinecraftDemo(args: GenerateMinecraftDemoArgs): string {
  const { project_path } = args;
  if (!project_path) throw new Error("project_path is required");

  if (!fs.existsSync(project_path)) {
    initProject({ project_path, project_name: "Minecraft2D" });
  }

  const scenesDir = path.resolve(project_path, "scenes");
  const scriptsDir = path.resolve(project_path, "scripts");
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });

  // ── world.gd ──
  const worldGd = `extends TileMap
const WORLD_W: int = 300
const WORLD_H: int = 48
enum BlockType { AIR = -1, GRASS = 0, DIRT = 1, STONE = 2, COAL = 3, IRON = 4, GOLD = 5, DIAMOND = 6, WOOD = 7, LEAVES = 8, SAND = 9, BEDROCK = 10 }
const BS: int = 16
var _blocks: Array
var _ready2: bool = false
func _ready() -> void:
	_setup()
	_gen()
	_render()
func _setup() -> void:
	var cols: Array[Color] = [
		Color(0.25, 0.65, 0.15), Color(0.5, 0.35, 0.2), Color(0.45, 0.45, 0.45),
		Color(0.25, 0.25, 0.25), Color(0.8, 0.6, 0.4), Color(1, 0.75, 0.1),
		Color(0.3, 0.85, 1), Color(0.4, 0.25, 0.1), Color(0.15, 0.55, 0.1),
		Color(0.8, 0.75, 0.5), Color(0.3, 0.3, 0.3),
	]
	var img := Image.create(BS * cols.size(), BS, false, Image.FORMAT_RGBA8)
	for t: int in cols.size():
		var b: Color = cols[t]
		for x: int in BS:
			for y: int in BS:
				var c: Color = b
				if x == 0 or y == 0: c = c.lightened(0.2)
				if x == BS - 1 or y == BS - 1: c = c.darkened(0.2)
				if randf() < 0.1: c = c.darkened(0.05)
				img.set_pixel(t * BS + x, y, c)
	var tex := ImageTexture.create_from_image(img)
	var ts := TileSet.new()
	var src := TileSetAtlasSource.new()
	src.texture = tex
	src.texture_region_size = Vector2i(BS, BS)
	for i: int in cols.size():
		src.create_tile(Vector2i(i, 0))
	ts.add_source(src, 0)
	ts.add_physics_layer()
	ts.set_physics_layer_collision_layer(0, 1)
	ts.set_physics_layer_collision_mask(0, 1)
	for i: int in cols.size():
		var td: TileData = src.get_tile_data(Vector2i(i, 0), 0)
		if td != null:
			td.add_collision_polygon(0)
			td.set_collision_polygon_points(0, 0, PackedVector2Array([
				Vector2(0, 0), Vector2(BS, 0), Vector2(BS, BS), Vector2(0, BS)
			]))
	tile_set = ts
	_ready2 = true
func _gen() -> void:
	_blocks = []
	for x: int in WORLD_W:
		_blocks.append([])
		var h: float = sin(x * 0.05) * 5.0 + sin(x * 0.12) * 3.0 + sin(x * 0.02) * 4.0
		var ht: int = clampi(int(h + 28 + (randf() - 0.5) * 2), 20, 40)
		for y: int in WORLD_H:
			if y < ht: _blocks[x].append(BlockType.AIR)
			elif y == ht: _blocks[x].append(BlockType.GRASS)
			elif y < ht + 4: _blocks[x].append(BlockType.DIRT)
			elif y < ht + 12:
				var r: float = randf()
				if y > ht + 8 and r < 0.02: _blocks[x].append(BlockType.DIAMOND)
				elif y > ht + 6 and r < 0.06: _blocks[x].append(BlockType.GOLD)
				elif y > ht + 4 and r < 0.12: _blocks[x].append(BlockType.IRON)
				elif r < 0.2: _blocks[x].append(BlockType.COAL)
				else: _blocks[x].append(BlockType.STONE)
			elif y < WORLD_H - 2: _blocks[x].append(BlockType.STONE)
			else: _blocks[x].append(BlockType.BEDROCK)
		if ht > 22 and ht < 38 and randf() < 0.08:
			var th: int = 2 + randi() % 3
			for ty: int in range(ht - th - 1, ht):
				if ty >= 0 and ty < WORLD_H: _blocks[x][ty] = BlockType.WOOD
			for lx: int in range(maxi(1, x - 1), mini(WORLD_W - 1, x + 2)):
				if lx > x: continue
				for ly: int in range(maxi(1, ht - th - 3), maxi(1, ht - th - 1)):
					if ly < WORLD_H and _blocks[lx][ly] == BlockType.AIR:
						_blocks[lx][ly] = BlockType.LEAVES
func _render() -> void:
	if not _ready2: return
	clear()
	for x: int in WORLD_W:
		for y: int in WORLD_H:
			var t: int = _blocks[x][y]
			if t != BlockType.AIR: set_cell(0, Vector2i(x, y), 0, Vector2i(t, 0))
func surf_at(x: int) -> int:
	if x < 0 or x >= WORLD_W: return 28
	for y: int in WORLD_H:
		if _blocks[x][y] != BlockType.AIR: return y
	return 28
func get_b(x: int, y: int) -> int:
	if x < 0 or x >= WORLD_W or y < 0 or y >= WORLD_H: return BlockType.AIR
	return _blocks[x][y]
func set_b(x: int, y: int, t: int) -> void:
	if x < 0 or x >= WORLD_W or y < 0 or y >= WORLD_H: return
	_blocks[x][y] = t
	if t != BlockType.AIR: set_cell(0, Vector2i(x, y), 0, Vector2i(t, 0))
	else: erase_cell(0, Vector2i(x, y))
func break_b(x: int, y: int) -> int:
	var t: int = get_b(x, y)
	if t == BlockType.AIR or t == BlockType.BEDROCK: return BlockType.AIR
	set_b(x, y, BlockType.AIR)
	return t
func w2b(wp: Vector2) -> Vector2i: return local_to_map(wp)
func b2w(bx: int, by: int) -> Vector2: return map_to_local(Vector2i(bx, by))
`;
  fs.writeFileSync(path.join(scriptsDir, "world.gd"), worldGd, "utf-8");

  // ── player.gd ──
  // FIX 2026-07-03: Use raw keycodes (KEY_A/KEY_D/KEY_SPACE) instead of ui_* actions,
  // because programmatically created projects have an empty InputMap.
  // FIX 2026-07-03: Use # for FALLBACK sprite flip based on velocity direction
  // since there's no visual sprite to flip.
  const playerGd = `extends CharacterBody2D
@onready var _world: TileMap = get_node_or_null("/root/Main/World") as TileMap
@export var spd: float = 150.0
@export var jmp: float = -300.0
@export var grav: float = 700.0
@export var reach: float = 80.0
var _sel: int = 0
var _bar: Array[int] = [0, 1, 2, 3, 4, 5, 6, 9]
var _inv: Dictionary = {}
var _fr: bool = true
func _ready() -> void:
	if _world != null:
		var cx: int = 150
		var sy: int = _world.call("surf_at", cx)
		global_position = _world.call("b2w", cx, sy) + Vector2(0, -40)
	for t: int in _bar: _inv[t] = 99
	_upd_hud()
func _physics_process(d: float) -> void:
	if not is_on_floor(): velocity.y += grav * d
	var dir: float = 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): dir = -1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): dir = 1.0
	if dir != 0.0:
		velocity.x = dir * spd
		_fr = dir > 0
	else:
		velocity.x = move_toward(velocity.x, 0, spd * 5 * d)
	if Input.is_key_pressed(KEY_SPACE) and is_on_floor():
		velocity.y = jmp
	move_and_slide()
func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton:
		var mb: InputEventMouseButton = e as InputEventMouseButton
		if not mb.pressed: return
		match mb.button_index:
			MOUSE_BUTTON_LEFT: _try_break()
			MOUSE_BUTTON_RIGHT: _try_place()
			MOUSE_BUTTON_WHEEL_UP: _sel = wrapi(_sel - 1, 0, _bar.size()); _upd_hud()
			MOUSE_BUTTON_WHEEL_DOWN: _sel = wrapi(_sel + 1, 0, _bar.size()); _upd_hud()
	if e is InputEventKey:
		for i: int in 8:
			if e.keycode == KEY_1 + i: _sel = i; _upd_hud(); break
func _try_break() -> void:
	if _world == null: return
	var mp: Vector2 = get_global_mouse_position()
	if global_position.distance_to(mp) > reach: return
	var bv: Vector2i = _world.call("w2b", mp)
	var bt: int = _world.call("break_b", bv.x, bv.y)
	if bt >= 0:
		if not _inv.has(bt): _inv[bt] = 0
		_inv[bt] += 1
		_upd_hud()
func _try_place() -> void:
	if _world == null: return
	var bt: int = _bar[_sel]
	if _inv.get(bt, 0) <= 0: return
	var mp: Vector2 = get_global_mouse_position()
	if global_position.distance_to(mp) > reach: return
	var bv: Vector2i = _world.call("w2b", mp)
	if _world.call("get_b", bv.x, bv.y) >= 0: return
	var pbv: Vector2i = _world.call("w2b", global_position)
	if abs(bv.x - pbv.x) <= 1 and abs(bv.y - pbv.y) <= 2: return
	_world.call("set_b", bv.x, bv.y, bt)
	_inv[bt] -= 1
	_upd_hud()
func _upd_hud() -> void:
	var h := get_node_or_null("/root/Main/HUD")
	if h != null and h.has_method("upd"): h.call("upd", _bar, _sel, _inv)
`;
  fs.writeFileSync(path.join(scriptsDir, "player.gd"), playerGd, "utf-8");

  // ── hud.gd ──
  const hudGd = `extends CanvasLayer
var _names: Dictionary = {0:"草",1:"泥土",2:"石头",3:"煤",4:"铁",5:"金",6:"钻石",7:"木头",8:"树叶",9:"沙子",10:"基岩"}
var _cols: Dictionary = {0:Color(0.25,0.65,0.15),1:Color(0.5,0.35,0.2),2:Color(0.5,0.5,0.5),3:Color(0.25,0.25,0.25),4:Color(0.8,0.6,0.4),5:Color(1,0.75,0.1),6:Color(0.3,0.85,1),7:Color(0.4,0.25,0.1),8:Color(0.15,0.55,0.1),9:Color(0.8,0.75,0.5),10:Color(0.3,0.3,0.3)}
var _slots: Array[ColorRect] = []
var _lbls: Array[Label] = []
var _sel: ColorRect
var _info: Label
func _ready() -> void:
	var vs: Vector2 = get_viewport().size
	var p := ColorRect.new()
	p.color = Color(0,0,0,0.6)
	p.offset_left = -200; p.offset_top = -30; p.offset_right = 200; p.offset_bottom = 30
	p.position = Vector2(vs.x / 2, vs.y - 50)
	add_child(p)
	for i: int in 8:
		var s := ColorRect.new()
		s.size = Vector2(36, 36)
		s.position = Vector2(p.position.x - 180 + i * 44, p.position.y - 18)
		s.color = Color(0.3,0.3,0.3,0.8)
		add_child(s); _slots.append(s)
		var l := Label.new()
		l.position = Vector2(s.position.x, s.position.y + 30)
		l.size = Vector2(36, 16)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.add_theme_color_override("font_color", Color(1,1,1,0.7))
		l.add_theme_font_size_override("font_size", 9)
		add_child(l); _lbls.append(l)
	_sel = ColorRect.new()
	_sel.size = Vector2(38, 38)
	_sel.color = Color(0,0,0,0)
	_sel.modulate = Color(1,1,0.4,0.8)
	add_child(_sel)
	_info = Label.new()
	_info.position = Vector2(vs.x / 2 + 210, vs.y - 65)
	_info.add_theme_color_override("font_color", Color(1,1,1,0.9))
	_info.add_theme_font_size_override("font_size", 12)
	add_child(_info)
	var h := Label.new()
	h.position = Vector2(16, 16)
	h.text = "A/D:移动 空格:跳跃 左键:挖掘 右键:放置 数字键/滚轮:选方块"
	h.add_theme_color_override("font_color", Color(1,1,1,0.4))
	h.add_theme_font_size_override("font_size", 10)
	add_child(h)
func upd(bar: Array, sel: int, inv: Dictionary) -> void:
	if _slots.is_empty(): return
	_sel.position = Vector2(_slots[0].position.x - 1 + sel * 44, _slots[0].position.y - 1)
	for i: int in bar.size():
		var t: int = bar[i]
		_slots[i].modulate = _cols.get(t, Color(1,1,1))
		_lbls[i].text = str(inv.get(t, 0))
	var bt: int = bar[sel]
	_info.text = _names.get(bt, "?") + " x" + str(inv.get(bt, 0))
`;
  fs.writeFileSync(path.join(scriptsDir, "hud.gd"), hudGd, "utf-8");

  // ── Main.tscn — uses shared theme config values ──
  const [sr, sg, sb] = SKY.DAY;
  const [gr, gg, gb] = GROUND.GRASS;
  const [br, bg, bb] = PLAYER.BODY_COLOR;
  const [hr, hg, hb] = PLAYER.HEAD_COLOR;
  const bodyW = PLAYER.BODY_WIDTH;
  const bodyH = PLAYER.BODY_HEIGHT;
  const headW = PLAYER.HEAD_WIDTH;
  const headH = PLAYER.HEAD_HEIGHT;

  const tscn = [
    `[gd_scene load_steps=5 format=3 uid="uid://mc_demo_gen"]`,
    `[ext_resource type="Script" path="res://scripts/player.gd" id="1"]`,
    `[ext_resource type="Script" path="res://scripts/hud.gd" id="2"]`,
    `[ext_resource type="Script" path="res://scripts/world.gd" id="3"]`,
    `[sub_resource type="RectangleShape2D" id="PS"]`,
    `size = Vector2(${bodyW}, ${bodyH})`,
    `[node name="Main" type="Node2D"]`,
    `[node name="Sky" type="ColorRect" parent="."]`,
    `anchor_right = 1.0`,
    `anchor_bottom = 1.0`,
    `color = Color(${sr}, ${sg}, ${sb}, 1)`,
    `[node name="World" type="TileMap" parent="."]`,
    `script = ExtResource("3")`,
    `[node name="Player" type="CharacterBody2D" parent="."]`,
    `script = ExtResource("1")`,
    `[node name="Body" type="ColorRect" parent="Player"]`,
    `offset_left = ${-bodyW / 2}`,
    `offset_top = ${-bodyH}`,
    `offset_right = ${bodyW / 2}`,
    `offset_bottom = 0`,
    `color = Color(${br}, ${bg}, ${bb}, 1)`,
    `[node name="Head" type="ColorRect" parent="Player"]`,
    `offset_left = ${-headW / 2}`,
    `offset_top = ${-(bodyH + headH)}`,
    `offset_right = ${headW / 2}`,
    `offset_bottom = ${-bodyH}`,
    `color = Color(${hr}, ${hg}, ${hb}, 1)`,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]`,
    `shape = SubResource("PS")`,
    `position = Vector2(0, ${-bodyH / 2})`,
    `[node name="Camera2D" type="Camera2D" parent="Player"]`,
    `position_smoothing_enabled = true`,
    `position_smoothing_speed = 6.0`,
    `[node name="HUD" type="CanvasLayer" parent="."]`,
    `layer = 10`,
    `script = ExtResource("2")`,
  ].join("\n");
  fs.writeFileSync(path.join(scenesDir, "Main.tscn"), tscn, "utf-8");

  // Update project.godot
  const projectFile = path.join(project_path, "project.godot");
  let projectConfig = fs.readFileSync(projectFile, "utf-8");
  projectConfig = projectConfig.replace(/config\/name="[^"]*"/, `config/name="Minecraft2D"`);
  projectConfig = projectConfig.replace(/run\/main_scene="[^"]*"/, `run/main_scene="res://scenes/Main.tscn"`);
  fs.writeFileSync(projectFile, projectConfig, "utf-8");

  return [
    `=== Minecraft 2D Demo Generated ===`,
    ``,
    `Files:`,
    `  scenes/Main.tscn`,
    `  scripts/world.gd`,
    `  scripts/player.gd`,
    `  scripts/hud.gd`,
    ``,
    `Controls:`,
    `  A/D  — move (raw keycode, no InputMap dependency)`,
    `  Space — jump`,
    `  LMB  — break block`,
    `  RMB  — place block`,
    `  1-8 / wheel — select block`,
    ``,
    `Fixes applied:`,
    `  - A/D now use Input.is_key_pressed(KEY_A/KEY_D) directly`,
    `  - CollisionShape2D positioned at y=-26, aligned with visual foot`,
    `  - CollisionShape height changed to 52 to match body height`,
    ``,
    `To run: godot --path <project> --scene res://scenes/Main.tscn`,
  ].join("\n");
}
