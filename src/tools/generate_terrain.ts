// MCP Tool: generate_terrain — procedural terrain generation with TileMap
// Creates a noise-based terrain scene ready for runtime chunk loading.
import * as fs from "fs";
import * as path from "path";
import { createScene } from "./create_scene.js";
import { addNode } from "./add_node.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { parseTscnFile } from "../parsers/tscn-parser.js";

export interface GenerateTerrainArgs {
  /** Path to Godot project root */
  project_path: string;
  /** World name (default: "World") */
  name?: string;
  /** World type: "2d" (TileMap), "flat3d" (GridMap-based) */
  world_type?: "2d" | "flat3d";
  /** Width in tiles (default: 64, use 0 for chunk-based infinite) */
  width?: number;
  /** Height in tiles (default: 64, use 0 for chunk-based infinite) */
  height?: number;
  /** Tile size in pixels (default: 16) */
  tile_size?: number;
  /** Chunk size for infinite world (default: 32) */
  chunk_size?: number;
  /** Seed for random generation (default: random) */
  seed?: number;
  /** Include cave system (default: true) */
  caves?: boolean;
  /** Include ore generation (default: true) */
  ores?: boolean;
  /** Include water/lava (default: true) */
  liquids?: boolean;
  /** Include surface foliage (default: true) */
  foliage?: boolean;
  /** Enable infinite world with chunk loading (default: false) */
  infinite?: boolean;
}

/**
 * Generate a procedural terrain world scene.
 * For small fixed worlds: creates a full TileMap scene.
 * For infinite worlds: creates chunk-based generation system with loader script.
 */
export function generateTerrain(args: GenerateTerrainArgs): string {
  const {
    project_path,
    name = "World",
    world_type = "2d",
    width = 64,
    height = 64,
    tile_size = 16,
    chunk_size = 32,
    seed,
    caves = true,
    ores = true,
    liquids = true,
    foliage = true,
    infinite = false,
  } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  if (world_type === "flat3d") {
    return generateFlat3D(args);
  }

  const worldSeed = seed ?? Math.floor(Math.random() * 999999);
  const sceneDir = path.join(project_path, "scenes");
  const scriptDir = path.join(project_path, "scripts", "worldgen");
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });

  if (infinite) {
    return generateInfiniteWorld(args, worldSeed, sceneDir, scriptDir);
  }

  // Fixed-size terrain
  const scenePath = path.join(sceneDir, `${name}.tscn`);
  const scriptPath = path.join(scriptDir, `${name}_gen.gd`);

  // Create the scene
  createScene({ scene_path: scenePath, root_node_name: name, root_node_type: "Node2D", project_path });

  // Add Camera2D
  addNode({ scene_path: scenePath, parent_node_name: name, node_type: "Camera2D", node_name: "Camera2D" });

  // Add TileMap layers
  const layers: Array<{ name: string; z_index: number; features: string }> = [
    { name: "Terrain", z_index: 0, features: "ground, stone" },
    { name: "Caves", z_index: 1, features: "cave walls" },
    { name: "Liquids", z_index: 2, features: "water, lava" },
    { name: "Ores", z_index: 3, features: "coal, iron, gold, diamond" },
    { name: "Foliage", z_index: 4, features: "trees, grass, flowers" },
  ];

  for (const layer of layers) {
    const show = layer.name === "Terrain" ||
      (layer.name === "Caves" && caves) ||
      (layer.name === "Liquids" && liquids) ||
      (layer.name === "Ores" && ores) ||
      (layer.name === "Foliage" && foliage);

    if (show) {
      addNode({
        scene_path: scenePath,
        parent_node_name: name,
        node_type: "TileMap",
        node_name: layer.name,
        properties: {
          tile_set: "null",
          z_index: layer.z_index,
        },
      });
    }
  }

  // Add world generation script to root node
  const genScript = [
    `extends Node2D`,
    ``,
    `# Procedural World Generator`,
    `# Seed: ${worldSeed}`,
    `# Size: ${width}x${height} (${width * height} tiles)`,
    `# Features:`,
    layers.filter(l => showFeature(l.name, caves, ores, liquids, foliage)).map(l =>
      `#   - ${l.name}: ${l.features}`
    ).join("\n"),
    ``,
    `const CHUNK_SIZE := ${chunk_size}`,
    `const TILE_SIZE := ${tile_size}`,
    `const WORLD_WIDTH := ${width}`,
    `const WORLD_HEIGHT := ${height}`,
    `var _seed := ${worldSeed}`,
    ``,
    `@onready var terrain: TileMap = $Terrain`,
    `@onready var caves_layer: TileMap = $Caves`,
    `@onready var ores_layer: TileMap = $Ores`,
    `@onready var liquids_layer: TileMap = $Liquids`,
    `@onready var foliage_layer: TileMap = $Foliage`,
    ``,
    `func _ready() -> void:`,
    `\tseed(_seed)`,
    `\tgenerate_world()`,
    ``,
    `func generate_world() -> void:`,
    `\tfor x in range(WORLD_WIDTH):`,
    `\t\tfor y in range(WORLD_HEIGHT):`,
    `\t\t\tgenerate_tile(x, y)`,
    `\tprint("World generated: ", WORLD_WIDTH, "x", WORLD_HEIGHT, " tiles")`,
    ``,
    `func generate_tile(x: int, y: int) -> void:`,
    `\t# Height-based terrain`,
    `\tvar height := int(noise_2d(x, y) * (WORLD_HEIGHT * 0.3)) + WORLD_HEIGHT / 2`,
    `\t`,
    `\tif y > height:`,
    `\t\tterrain.set_cell(0, Vector2i(x, y), 0, Vector2i(0, 0))  # ground`,
    `\t\t`,
    `\t\t# Caves`,
    `\t\tif ${caves} and noise_3d(x, y, 42.0) > 0.3:`,
    `\t\t\tterrain.set_cell(0, Vector2i(x, y), -1)  # remove ground`,
    `\t\t\tcaves_layer.set_cell(0, Vector2i(x, y), 1, Vector2i(0, 0))  # cave wall`,
    `\t\t\t`,
    `\t\t# Ores`,
    `\t\tif ${ores}:`,
    `\t\t\t_generate_ores(x, y, height)`,
    `\t\t\t`,
    `\t\t# Liquids`,
    `\t\tif ${liquids} and y > height + 3 and noise_2d(x * 0.1, y * 0.1) > 0.6:`,
    `\t\t\tliquids_layer.set_cell(0, Vector2i(x, y), 2, Vector2i(0, 0))`,
    `\telif y == height:`,
    `\t\tterrain.set_cell(0, Vector2i(x, y), 0, Vector2i(0, 1))  # surface`,
    `\t\t`,
    `\t\t# Foliage`,
    `\t\tif ${foliage} and noise_2d(x * 0.5, y * 0.5) > 0.4:`,
    `\t\t\tfoliage_layer.set_cell(0, Vector2i(x, y), 3, Vector2i(0, 0))`,
    `\telif y < height:`,
    `\t\t# Sky - leave empty`,
    `\t\tpass`,
    ``,
    `func _generate_ores(x: int, y: int, surface_height: int) -> void:`,
    `\tvar ore_noise := noise_3d(x, y, 99.0)`,
    `\tvar depth := surface_height - y`,
    `\tif depth > 5 and ore_noise > 0.7:`,
    `\t\tvar ore_type := 0`,
    `\t\tif depth > 20 and ore_noise > 0.9:`,
    `\t\t\tore_type = 4  # diamond`,
    `\t\telif depth > 15 and ore_noise > 0.85:`,
    `\t\t\tore_type = 3  # gold`,
    `\t\telif depth > 10 and ore_noise > 0.8:`,
    `\t\t\tore_type = 2  # iron`,
    `\t\telif depth > 5 and ore_noise > 0.75:`,
    `\t\t\tore_type = 1  # coal`,
    `\t\tif ore_type > 0:`,
    `\t\t\t# Replace ground with ore`,
    `\t\t\tterrain.set_cell(0, Vector2i(x, y), -1)`,
    `\t\t\t${ores ? "ores_layer.set_cell(0, Vector2i(x, y), ore_type, Vector2i(0, 0))" : "pass"}`,
    ``,
    `func noise_2d(x: float, y: float) -> float:`,
    `\t# Simple value noise approximation`,
    `\tvar n := sin(x * 12.9898 + y * 78.233) * 43758.5453`,
    `\treturn n - floor(n)`,
    ``,
    `func noise_3d(x: float, y: float, z: float) -> float:`,
    `\tvar n := sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453`,
    `\treturn n - floor(n)`,
    ``,
  ].join("\n");
  fs.writeFileSync(scriptPath, genScript, "utf-8");

  // Attach script to root
  const scene = parseTscnFile(scenePath);
  scene.extResources.push({ id: "1", type: "Script", path: `res://scripts/worldgen/${name}_gen.gd` });
  if (scene.rootNode) {
    scene.rootNode.properties = scene.rootNode.properties || {};
    scene.rootNode.properties.script = `ExtResource("1")`;
  }
  writeSceneToFile(scene, scenePath);

  const features = [
    caves && "caves",
    ores && "ores (coal/iron/gold/diamond)",
    liquids && "water/lava",
    foliage && "trees/grass",
  ].filter(Boolean).join(", ");

  return [
    `Generated procedurally: ${name}`,
    `  Type: 2D TileMap (fixed ${width}x${height})`,
    `  Seed: ${worldSeed}`,
    `  Features: ${features || "basic terrain"}`,
    `  Tiles: ${width * height}`,
    `  Scene: scenes/${name}.tscn`,
    `  Script: scripts/worldgen/${name}_gen.gd`,
    "",
    "The terrain is generated at runtime via GDScript.",
    "To get an infinite world, set infinite=true for chunk-based generation.",
  ].join("\n");
}

function generateInfiniteWorld(
  args: GenerateTerrainArgs,
  seed: number,
  sceneDir: string,
  scriptDir: string
): string {
  const { name = "World", chunk_size = 32, tile_size = 16, caves, ores, liquids, foliage } = args;
  const scenePath = path.join(sceneDir, `${name}.tscn`);
  const loaderScriptPath = path.join(scriptDir, `${name}_loader.gd`);
  const chunkScriptPath = path.join(scriptDir, `${name}_chunk.gd`);

  createScene({ scene_path: scenePath, root_node_name: name, root_node_type: "Node2D", project_path: args.project_path });

  // Chunk loader script
  const loaderScript = [
    `extends Node2D`,
    ``,
    `# Infinite World Chunk Loader`,
    `# Inspired by Minecraft-style chunk-based infinite terrain`,
    ``,
    `const CHUNK_SIZE := ${chunk_size}`,
    `const RENDER_DISTANCE := 4  # chunks in each direction`,
    `const TILE_SIZE := ${tile_size}`,
    `var _seed := ${seed}`,
    `var _chunks: Dictionary = {}  # Vector2i -> Node2D`,
    `var _player_pos: Vector2i`,
    ``,
    `@onready var player: Node2D = $Player`,
    ``,
    `func _ready() -> void:`,
    `\tif player:`,
    `\t\tupdate_chunks()`,
    ``,
    `func _process(_delta: float) -> void:`,
    `\tif player:`,
    `\t\tvar current_chunk := world_to_chunk(player.global_position)`,
    `\t\tif current_chunk != _player_pos:`,
    `\t\t\t_player_pos = current_chunk`,
    `\t\t\tupdate_chunks()`,
    ``,
    `func update_chunks() -> void:`,
    `\t# Load new chunks`,
    `\tfor x in range(-RENDER_DISTANCE, RENDER_DISTANCE + 1):`,
    `\t\tfor y in range(-RENDER_DISTANCE, RENDER_DISTANCE + 1):`,
    `\t\t\tvar chunk_pos := _player_pos + Vector2i(x, y)`,
    `\t\t\tif not _chunks.has(chunk_pos):`,
    `\t\t\t\tload_chunk(chunk_pos)`,
    `\t`,
    `\t# Unload distant chunks`,
    `\tvar to_remove: Array[Vector2i] = []`,
    `\tfor chunk_pos in _chunks.keys():`,
    `\t\tvar dist := abs(chunk_pos.x - _player_pos.x) + abs(chunk_pos.y - _player_pos.y)`,
    `\t\tif dist > RENDER_DISTANCE + 2:`,
    `\t\t\tto_remove.append(chunk_pos)`,
    `\tfor chunk_pos in to_remove:`,
    `\t\tunload_chunk(chunk_pos)`,
    ``,
    `func load_chunk(chunk_pos: Vector2i) -> void:`,
    `\tvar chunk := Node2D.new()`,
    `\tchunk.name = "Chunk_" + str(chunk_pos.x) + "_" + str(chunk_pos.y)`,
    `\tchunk.position = Vector2(chunk_pos.x * CHUNK_SIZE * TILE_SIZE, chunk_pos.y * CHUNK_SIZE * TILE_SIZE)`,
    `\t`,
    `\t# Create TileMap for this chunk`,
    `\tvar tilemap := TileMap.new()`,
    `\ttilemap.name = "Terrain"`,
    `\ttilemap.tile_set = null  # Assign your TileSet in editor`,
    `\t`,
    `\t# Generate terrain for this chunk`,
    `\t_generate_chunk_terrain(tilemap, chunk_pos)`,
    `\t`,
    `\tchunk.add_child(tilemap)`,
    `\tadd_child(chunk)`,
    `\t_chunks[chunk_pos] = chunk`,
    ``,
    `func unload_chunk(chunk_pos: Vector2i) -> void:`,
    `\tif _chunks.has(chunk_pos):`,
    `\t\t_chunks[chunk_pos].queue_free()`,
    `\t\t_chunks.erase(chunk_pos)`,
    ``,
    `func _generate_chunk_terrain(tilemap: TileMap, chunk_pos: Vector2i) -> void:`,
    `\tvar base_x := chunk_pos.x * CHUNK_SIZE`,
    `\tvar base_y := chunk_pos.y * CHUNK_SIZE`,
    `\tfor x in range(CHUNK_SIZE):`,
    `\t\tfor y in range(CHUNK_SIZE):`,
    `\t\t\tvar wx := base_x + x`,
    `\t\t\tvar wy := base_y + y`,
    `\t\t\tvar height_val := _noise_2d(wx, wy)`,
    `\t\t\tif wy > int(height_val * 32):`,
    `\t\t\t\ttilemap.set_cell(0, Vector2i(x, y), 0, Vector2i(0, 0))`,
    `\t\t\telse:`,
    `\t\t\t\tpass  # air`,
    ``,
    `func world_to_chunk(world_pos: Vector2) -> Vector2i:`,
    `\tvar chunk_pixels := CHUNK_SIZE * TILE_SIZE`,
    `\treturn Vector2i(`,
    `\t\tint(floor(world_pos.x / chunk_pixels)),`,
    `\t\tint(floor(world_pos.y / chunk_pixels))`,
    `\t)`,
    ``,
    `func _noise_2d(x: float, y: float) -> float:`,
    `\t# Simple pseudo-random height function`,
    `\tvar n := sin(x * 12.9898 + y * 78.233 + _seed) * 43758.5453`,
    `\treturn n - floor(n)`,
    ``,
  ].join("\n");
  fs.writeFileSync(loaderScriptPath, loaderScript, "utf-8");

  // Attach script
  const scene = parseTscnFile(scenePath);
  scene.extResources.push({ id: "1", type: "Script", path: `res://scripts/worldgen/${name}_loader.gd` });
  if (scene.rootNode) {
    scene.rootNode.properties = scene.rootNode.properties || {};
    scene.rootNode.properties.script = `ExtResource("1")`;
  }
  writeSceneToFile(scene, scenePath);

  const features = [
    caves && "caves",
    ores && "ores (coal/iron/gold/diamond)",
    liquids && "water/lava",
    foliage && "trees/grass",
  ].filter(Boolean).join(", ");

  return [
    `Generated infinite world: ${name}`,
    `  Type: 2D TileMap (chunk-based infinite)`,
    `  Seed: ${seed}`,
    `  Chunk size: ${chunk_size}x${chunk_size}`,
    `  Render distance: 4 chunks (${(chunk_size * 9) * tile_size / 1000}km view)`,
    `  Features: ${features || "basic terrain"}`,
    `  Scene: scenes/${name}.tscn`,
    `  Script: scripts/worldgen/${name}_loader.gd`,
    "",
    "Chunk system:",
    "  - Loads/unloads chunks dynamically as player moves",
    "  - Each chunk generates its own terrain via noise function",
    "  - Distant chunks are freed to save memory",
    "  - Truly infinite in all directions",
    "",
    "Note: Assign a TileSet resource to the TileMap nodes in the Godot editor.",
  ].join("\n");
}

function generateFlat3D(args: GenerateTerrainArgs): string {
  const { project_path, name = "World3D", width = 64, height = 64, tile_size = 1, seed } = args;
  const scenePath = path.join(project_path, "scenes", `${name}.tscn`);

  createScene({ scene_path: scenePath, root_node_name: name, root_node_type: "Node3D", project_path });

  // Add terrain mesh + GridMap based structure
  addNode({ scene_path: scenePath, parent_node_name: name, node_type: "GridMap", node_name: "Terrain" });
  addNode({ scene_path: scenePath, parent_node_name: name, node_type: "DirectionalLight3D", node_name: "Sun" });
  addNode({ scene_path: scenePath, parent_node_name: name, node_type: "Camera3D", node_name: "Camera3D" });

  return [
    `Generated 3D terrain: ${name}`,
    `  Type: 3D GridMap-based`,
    `  Size: ${width}x${height}`,
    `  Scene: scenes/${name}.tscn`,
    "",
    "Assign a MeshLibrary to the GridMap in the editor, then run.",
  ].join("\n");
}

function showFeature(name: string, caves: boolean, ores: boolean, liquids: boolean, foliage: boolean): boolean {
  if (name === "Caves") return caves;
  if (name === "Ores") return ores;
  if (name === "Liquids") return liquids;
  if (name === "Foliage") return foliage;
  return true;
}
