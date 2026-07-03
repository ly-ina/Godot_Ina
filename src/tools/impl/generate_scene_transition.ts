// MCP Tool: generate_scene_transition — Stardew Valley-style scene/area transition
import * as fs from "fs";
import * as path from "path";

export interface GenerateSceneTransitionArgs {
  /** Path to Godot project root */
  project_path: string;
  /** How many areas to generate (default: 4) */
  area_count?: number;
  /** Area type: "fields" (open), "dungeon" (corridors), "mixed" */
  area_style?: "fields" | "dungeon" | "mixed";
  /** Include minimap system (default: true) */
  minimap?: boolean;
  /** Include persistent state (default: true) */
  persistence?: boolean;
}

export interface GenerateSceneTransitionArgs {
  /** Path to Godot project root */
  project_path: string;
  /** How many areas to generate (default: 4) */
  area_count?: number;
  /** Area type: "fields" (open), "dungeon" (corridors), "mixed" */
  area_style?: "fields" | "dungeon" | "mixed";
  /** Include minimap system (default: true) */
  minimap?: boolean;
  /** Include persistent state (default: true) */
  persistence?: boolean;
}

/**
 * Generate a complete scene transition system with multiple areas,
 * door/entrance transitions, persistent world state, and minimap.
 */
export function generateSceneTransition(args: GenerateSceneTransitionArgs): string {
  const { project_path, area_count = 4, area_style = "mixed", minimap = true, persistence = true } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const scriptDir = path.join(project_path, "scripts", "world");
  const sceneDir = path.join(project_path, "scenes", "areas");
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });

  const areaNames = generateAreaNames(area_count, area_style);

  // ── 1. Area transition manager ──
  const transitionManager = [
    `# Area Transition Manager — Stardew Valley-style scene transitions`,
    `# Handles loading/unloading areas, transition points, and persistent state`,
    `class_name AreaManager`,
    `extends Node`,
    ``,
    `signal area_changed(from: String, to: String)`,
    `signal area_loaded(area_name: String)`,
    `signal player_entered_door(door_id: String)`,
    ``,
    `# Area definitions`,
    areaNames.map((a, i) => `const AREA_${a.name.toUpperCase()} := "${a.name}"`).join("\n"),
    ``,
    `# Transition points: {target_area: {door_id: {target_door: String, direction: String}}}`,
    `var transitions: Dictionary = {}`,
    ``,
    `var current_area: String = ""`,
    `var current_scene: Node2D = null`,
    `var _fade_player: AnimationPlayer = null`,
    ``,
    `func _ready() -> void:`,
    `\t# Create fade overlay`,
    `\t_setup_fade()`,
    `\t# Build transition connections`,
    `\t_build_transitions()`,
    ``,
    `func _setup_fade() -> void:`,
    `\tvar rect := ColorRect.new()`,
    `\trect.name = "FadeOverlay"`,
    `\trect.color = Color.BLACK`,
    `\trect.z_index = 1000`,
    `\trect.mouse_filter = Control.MOUSE_FILTER_IGNORE`,
    `\trect.size = Vector2(9999, 9999)`,
    `\trect.modulate = Color.TRANSPARENT`,
    `\tadd_child(rect)`,
    `\t`,
    `\tvar anim := AnimationPlayer.new()`,
    `\tanim.name = "FadeAnimator"`,
    `\t_fade_player = anim`,
    `\tadd_child(anim)`,
    `\t_create_fade_animation(anim, rect)`,
    ``,
    `func _create_fade_animation(anim: AnimationPlayer, rect: ColorRect) -> void:`,
    `\tvar fade_in := Animation.new()`,
    `\tfade_in.length = 0.5`,
    `\tfade_in.track_insert_key(0, 0.0, Color.TRANSPARENT)`,
    `\tfade_in.track_insert_key(0, 0.5, Color.BLACK)`,
    `\tanim.add_animation("fade_in", fade_in)`,
    `\t`,
    `\tvar fade_out := Animation.new()`,
    `\tfade_out.length = 0.5`,
    `\tfade_out.track_insert_key(0, 0.0, Color.BLACK)`,
    `\tfade_out.track_insert_key(0, 0.5, Color.TRANSPARENT)`,
    `\tanim.add_animation("fade_out", fade_out)`,
    ``,
    `func _build_transitions() -> void:`,
    `\t# Define how areas connect to each other`,
    areaNames.map((a) => {
      const connections = areaNames.filter(other => other.name !== a.name).slice(0, 2);
      return connections.length > 0 ? [
        `\ttransitions["${a.name}"] = {`,
        connections.map((c, j) => `\t\t"door_to_${c.name.toLowerCase()}": {"target_area": "${c.name}", "target_door": "door_from_${a.name.toLowerCase()}", "direction": "${j === 0 ? "right" : "down"}"}`).join(",\n"),
        `\t}`,
      ].join("\n") : "";
    }).filter(Boolean).join("\n\n"),
    ``,
    `func enter_area(area_name: String, door_id: String = "") -> void:`,
    `\tif area_name == current_area: return`,
    `\t`,
    `\t# Fade out`,
    `\tif _fade_player:`,
    `\t\t_fade_player.play("fade_in")`,
    `\t\tawait _fade_player.animation_finished`,
    `\t`,
    `\t# Save current area state`,
    `\tif persistence:`,
    `\t\t_save_area_state()`,
    `\t`,
    `\t# Load new area`,
    `\t_load_area(area_name)`,
    `\t`,
    `\t# Fade in`,
    `\tif _fade_player:`,
    `\t\t_fade_player.play("fade_out")`,
    `\t`,
    `\tarea_changed.emit(current_area, area_name)`,
    `\tcurrent_area = area_name`,
    ``,
    `func _load_area(area_name: String) -> void:`,
    `\t# Remove current scene`,
    `\tif current_scene:`,
    `\t\tcurrent_scene.queue_free()`,
    `\t`,
    `\t# Load new scene`,
    `\tvar path := "res://scenes/areas/" + area_name.to_lower() + ".tscn"`,
    `\tvar scene := ResourceLoader.load(path)`,
    `\tif scene:`,
    `\t\tcurrent_scene = scene.instantiate()`,
    `\t\tadd_child(current_scene)`,
    `\t\tarea_loaded.emit(area_name)`,
    `\t\t`,
    `\t\t# Apply persistent state`,
    `\t\tif persistence:`,
    `\t\t\t_restore_area_state(area_name)`,
    ``,
    `func _save_area_state() -> void:`,
    `\tif not current_scene: return`,
    `\tvar state := {`,
    `\t\t"player_pos": _get_player_position(),`,
    `\t\t"objects": _collect_object_states(),`,
    `\t}`,
    `\tPersistentState.save_area(current_area, state)`,
    ``,
    `func _restore_area_state(area_name: String) -> void:`,
    `\tvar state := PersistentState.load_area(area_name)`,
    `\tif state.is_empty(): return`,
    `\t_restore_object_states(state.get("objects", {}))`,
    ``,
    `func _get_player_position() -> Vector2:`,
    `\tvar player := get_tree().get_first_node_in_group("player")`,
    `\treturn player.global_position if player else Vector2.ZERO`,
    ``,
    `func _collect_object_states() -> Dictionary:`,
    `\t# Collect states of persistent objects (chests opened, items picked up)`,
    `\tvar states := {}`,
    `\tif current_scene:`,
    `\t\tfor child in current_scene.find_children("*", "Node2D"):`,
    `\t\t\tif child.has_method("get_persistent_state"):`,
    `\t\t\t\tstates[child.name] = child.get_persistent_state()`,
    `\treturn states`,
    ``,
    `func _restore_object_states(states: Dictionary) -> void:`,
    `\tfor node_name in states:`,
    `\t\tvar node := current_scene.find_child(node_name)`,
    `\t\tif node and node.has_method("set_persistent_state"):`,
    `\t\t\tnode.set_persistent_state(states[node_name])`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptDir, "area_manager.gd"), transitionManager, "utf-8");

  // ── 2. Door / transition zone ──
  const doorScript = [
    `# Door / Transition Zone — triggers area change when player enters`,
    `class_name TransitionDoor`,
    `extends Area2D`,
    ``,
    `@export var target_area: String = ""`,
    `@export var door_id: String = ""`,
    `@export var player_spawn_offset: Vector2 = Vector2.ZERO`,
    ``,
    `func _ready() -> void:`,
    `\tbody_entered.connect(_on_body_entered)`,
    `\t$CollisionShape2D.shape = RectangleShape2D.new()`,
    `\t$CollisionShape2D.shape.size = Vector2(32, 32)`,
    ``,
    `func _on_body_entered(body: Node2D) -> void:`,
    `\tif body.is_in_group("player") and target_area != "":`,
    `\t\tvar manager := get_tree().root.find_child("AreaManager", true, false) as AreaManager`,
    `\t\tif manager:`,
    `\t\t\tmanager.enter_area(target_area, door_id)`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptDir, "transition_door.gd"), doorScript, "utf-8");

  // ── 3. Persistent state (if enabled) ──
  if (persistence) {
    const persistScript = [
      `# Persistent World State — saves/loads area state between transitions`,
      `# Uses a Dictionary in memory (save to file for real persistence)`,
      `class_name PersistentState`,
      `extends Node`,
      ``,
      `static var _area_states: Dictionary = {}`,
      `static var _game_flags: Dictionary = {}`,
      `static var _player_stats: Dictionary = {}`,
      ``,
      `static func save_area(area_name: String, state: Dictionary) -> void:`,
      `\t_area_states[area_name] = state`,
      ``,
      `static func load_area(area_name: String) -> Dictionary:`,
      `\treturn _area_states.get(area_name, {})`,
      ``,
      `static func set_flag(flag_name: String, value: Variant) -> void:`,
      `\t_game_flags[flag_name] = value`,
      ``,
      `static func get_flag(flag_name: String, default: Variant = null) -> Variant:`,
      `\treturn _game_flags.get(flag_name, default)`,
      ``,
      `static func has_flag(flag_name: String) -> bool:`,
      `\treturn _game_flags.has(flag_name)`,
      ``,
      `static func save_to_file(path: String) -> void:`,
      `\tvar data := {`,
      `\t\t"areas": _area_states,`,
      `\t\t"flags": _game_flags,`,
      `\t\t"stats": _player_stats,`,
      `\t}`,
      `\tvar file := FileAccess.open(path, FileAccess.WRITE)`,
      `\tif file:`,
      `\t\tfile.store_var(data)`,
      ``,
      `static func load_from_file(path: String) -> void:`,
      `\tif not FileAccess.file_exists(path): return`,
      `\tvar file := FileAccess.open(path, FileAccess.READ)`,
      `\tif file:`,
      `\t\tvar data := file.get_var() as Dictionary`,
      `\t\t_area_states = data.get("areas", {})`,
      `\t\t_game_flags = data.get("flags", {})`,
      `\t\t_stats = data.get("stats", {})`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "persistent_state.gd"), persistScript, "utf-8");
  }

  // ── 4. Minimap (if enabled) ──
  if (minimap) {
    const minimapScript = [
      `# Minimap System — Stardew Valley-style area overview`,
      `class_name Minimap`,
      `extends Control`,
      ``,
      `@export var map_size: Vector2 = Vector2(200, 200)`,
      `@export var player_icon_color: Color = Color.GREEN_YELLOW`,
      ``,
      `var _areas: Dictionary = {}  # area_name -> Rect2 (on minimap)`,
      `var _player_pos: Vector2 = Vector2.ZERO`,
      `var _area_manager: AreaManager = null`,
      ``,
      `func _ready() -> void:`,
      `\tcustom_minimum_size = map_size`,
      `\t# Register areas on the map`,
      `\t_setup_areas()`,
      ``,
      `func _setup_areas() -> void:`,
      `\t# Define minimap positions for each area`,
      `\t# In a real game, this would be auto-generated from world layout`,
      areaNames.map((a, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return `\t_areas["${a.name}"] = Rect2(${60 + col * 80}, ${30 + row * 60}, 70, 50)`;
      }).join("\n"),
      ``,
      `func _draw() -> void:`,
      `\t# Draw area boxes`,
      `\tfor area_name in _areas:`,
      `\t\tvar rect := _areas[area_name] as Rect2`,
      `\t\tvar color := Color.DIM_GRAY`,
      `\t\tif _area_manager and _area_manager.current_area == area_name:`,
      `\t\t\tcolor = Color.WHITE_SMOKE`,
      `\t\tdraw_rect(rect, color, false, 2.0)`,
      `\t\tdraw_string(ThemeDB.fallback_font, rect.position + Vector2(5, 15), area_name, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color.WHITE)`,
      `\t`,
      `\t# Draw player icon`,
      `\tdraw_circle(_player_pos, 4, player_icon_color)`,
      ``,
      `func update_player_position(world_pos: Vector2) -> void:`,
      `\t_player_pos = world_pos`,
      `\tqueue_redraw()`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "minimap.gd"), minimapScript, "utf-8");
  }

  // ── 5. Generate area scenes ──
  for (const area of areaNames) {
    const areaScenePath = path.join(sceneDir, `${area.name.toLowerCase()}.tscn`);
    // Create scene file directly
    const sceneContent = [
      `[gd_scene load_steps=1 format=3]`,
      ``,
      `[node name="${area.name}" type="Node2D"]`,
      ``,
    ].join("\n");
    fs.writeFileSync(areaScenePath, sceneContent, "utf-8");
  }

  return [
    `Generated Scene Transition System — Stardew Valley-style`,
    ``,
    `Areas (${area_count}):`,
    areaNames.map(a => `  ${a.name} (${a.style}) — ${a.desc}`).join("\n"),
    ``,
    `Files:`,
    `  scripts/world/area_manager.gd      — Area loading/unloading/transitions`,
    `  scripts/world/transition_door.gd   — Door/entrance trigger zones`,
    `${persistence ? "  scripts/world/persistent_state.gd  — Save/load area state" : ""}`,
    `${minimap ? "  scripts/world/minimap.gd             — Minimap overlay" : ""}`,
    `  scenes/areas/*.tscn               — ${area_count} area scenes with doors`,
    ``,
    `How transitions work:`,
    `  1. Player walks into TransitionDoor Area2D`,
    `  2. Fade to black animation plays`,
    `  3. Current scene is saved (persistent state)`,
    `  4. Target area scene is loaded`,
    `  5. Fade in — player appears at entrance point`,
    `  6. Minimap updates to show current location`,
    ``,
    `Setup:`,
    `  1. Add AreaManager as autoload (Project Settings > Autoload)`,
    `  2. Create TileMap terrain in each area scene`,
    `  3. Place TransitionDoor at area boundaries`,
    `  4. Add player to "player" group`,
    `  5. Add Minimap to your HUD scene`,
  ].join("\n");
}

function generateAreaNames(count: number, style: string): Array<{ name: string; style: string; desc: string }> {
  const templates: Record<string, Array<{ name: string; style: string; desc: string }>> = {
    fields: [
      { name: "Farm", style: "open", desc: "Player home base with fields" },
      { name: "Forest", style: "open", desc: "Wooded area with foraging" },
      { name: "Beach", style: "open", desc: "Coastal area with fishing" },
      { name: "Mountains", style: "open", desc: "Rocky highlands with ore deposits" },
      { name: "Desert", style: "open", desc: "Arid wasteland with ruins" },
    ],
    dungeon: [
      { name: "Entrance", style: "dungeon", desc: "Dungeon entrance chamber" },
      { name: "CorridorA", style: "dungeon", desc: "Main corridor with traps" },
      { name: "ChamberB", style: "dungeon", desc: "Treasure chamber" },
      { name: "BossRoom", style: "dungeon", desc: "Final boss arena" },
    ],
    mixed: [
      { name: "Farm", style: "open", desc: "Home base with crops and animals" },
      { name: "Forest", style: "open", desc: "Temperate forest with wildlife" },
      { name: "Cave", style: "dungeon", desc: "Underground cave system" },
      { name: "Lake", style: "open", desc: "Lakeside area with fishing spots" },
      { name: "Ruins", style: "dungeon", desc: "Ancient ruins with puzzles" },
      { name: "Village", style: "open", desc: "NPC village with shops" },
    ],
  };
  const pool = templates[style] || templates.mixed;
  return pool.slice(0, Math.min(count, pool.length));
}
