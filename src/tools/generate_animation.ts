// MCP Tool: generate_animation — builds Godot animation system for characters
// Creates AnimatedSprite2D + AnimationPlayer + sprite sheet layout + animation GDScript
import * as fs from "fs";
import * as path from "path";
import { createScene } from "./create_scene.js";
import { addNode } from "./add_node.js";
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";

export interface GenerateAnimationArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Character name (used for filename) */
  name?: string;
  /** Sprite sheet frame width in pixels (default: 32) */
  frame_width?: number;
  /** Sprite sheet frame height in pixels (default: 48) */
  frame_height?: number;
  /** Animations to generate */
  animations?: string;
  /** Include idle animation (default: true) */
  idle?: boolean;
  /** Include walk animation (default: true) */
  walk?: boolean;
  /** Include run animation (default: false) */
  run?: boolean;
  /** Include crouch animation (default: false) */
  crouch?: boolean;
  /** Include turn/look animation (default: false) */
  turn?: boolean;
  /** Include jump animation (default: false) */
  jump?: boolean;
}

/**
 * Generate a complete character animation system for Godot.
 * Creates AnimatedSprite2D with sprite sheet, AnimationPlayer, and controller script.
 */
export function generateAnimation(args: GenerateAnimationArgs): string {
  const {
    project_path, name = "character",
    frame_width = 32, frame_height = 48,
    idle = true, walk = true, run = false,
    crouch = false, turn = false, jump = false,
  } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const sceneDir = path.resolve(project_path, "scenes", "characters");
  const scriptDir = path.resolve(project_path, "scripts", "characters");
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });

  const scenePath = path.resolve(sceneDir, `${name}.tscn`);
  const scriptPath = path.resolve(scriptDir, `${name}.gd`);

  // ── Calculate sprite sheet layout ──
  interface AnimDef { name: string; frames: number; fps: number; loop: boolean; hframes: number; }
  const animDefs: AnimDef[] = [];

  if (idle) animDefs.push({ name: "idle", frames: 4, fps: 4, loop: true, hframes: 4 });
  if (walk) animDefs.push({ name: "walk", frames: 4, fps: 8, loop: true, hframes: 4 });
  if (run) animDefs.push({ name: "run", frames: 4, fps: 12, loop: true, hframes: 4 });
  if (crouch) animDefs.push({ name: "crouch", frames: 2, fps: 4, loop: false, hframes: 2 });
  if (turn) animDefs.push({ name: "turn", frames: 3, fps: 6, loop: false, hframes: 3 });
  if (jump) animDefs.push({ name: "jump", frames: 3, fps: 6, loop: false, hframes: 3 });

  const totalFrames = animDefs.reduce((sum, a) => sum + a.frames, 0);
  const sheetWidth = 1024;
  const sheetHeight = 1024;
  const cols = Math.ceil(Math.sqrt(totalFrames));
  const rows = Math.ceil(totalFrames / cols);
  const cellW = sheetWidth / cols;
  const cellH = sheetHeight / rows;

  // ── GDScript controller ──
  const gdscript = [
    `extends CharacterBody2D`,
    ``,
    `@onready var anim: AnimatedSprite2D = $AnimatedSprite2D`,
    ``,
    `# Movement`,
    `@export var speed: float = 100.0`,
    `@export var run_speed: float = 180.0`,
    `@export var crouch_speed: float = 40.0`,
    ``,
    `var _facing_right: bool = true`,
    ``,
    `func _ready() -> void:`,
    `\tanim.play("idle")`,
    ``,
    `func _physics_process(_delta: float) -> void:`,
    `\tvar dir := Vector2.ZERO`,
    `\tdir.x = Input.get_axis("ui_left", "ui_right")`,
    `\tdir.y = Input.get_axis("ui_up", "ui_down")`,
    `\t`,
    `\t# Crouch`,
    `\tif Input.is_action_pressed("ui_down"):`,
    `\t\t${crouch ? 'anim.play("crouch")' : ""}`,
    `\t\tvelocity = dir.normalized() * crouch_speed`,
    `${run ? '\t# Run (Shift held)\n\telif Input.is_action_pressed("ui_accept"):\n\t\tanim.play("run")\n\t\tvelocity = dir.normalized() * run_speed' : ""}`,
    `\t# Walk`,
    `\telif dir.length() > 0:`,
    `\t\t${walk ? 'anim.play("walk")' : 'anim.play("idle")'}`,
    `\t\tvelocity = dir.normalized() * speed`,
    `\t# Idle`,
    `\telse:`,
    `\t\t${idle ? 'anim.play("idle")' : ""}`,
    `\t\tvelocity = Vector2.ZERO`,
    `\t`,
    `\t# Flip sprite based on direction`,
    `\tif dir.x != 0:`,
    `\t\t_facing_right = dir.x > 0`,
    `\t\tanim.scale.x = 1 if _facing_right else -1`,
    `\t`,
    `\t# Jump`,
    `\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():`,
    `\t\tvelocity.y = -300.0`,
    `\t\t${jump ? 'anim.play("jump")' : ""}`,
    `\t`,
    `\tmove_and_slide()`,
    ``,
  ].join("\n");
  fs.writeFileSync(scriptPath, gdscript, "utf-8");

  // ── Create scene ──
  createScene({ scene_path: scenePath, root_node_name: name, root_node_type: "CharacterBody2D", project_path });

  const scene = parseTscnFile(scenePath);

  // Add script ext_resource
  const scriptResPath = `res://scripts/characters/${name}.gd`;
  scene.extResources.push({ id: "1", type: "Script", path: scriptResPath });

  // Add AnimatedSprite2D as ext_resource (it's a built-in type, no ext_resource needed)
  // But we need it as a child node
  if (scene.rootNode) {
    scene.rootNode.properties = scene.rootNode.properties || {};
    scene.rootNode.properties.script = `ExtResource("1")`;
  }

  writeSceneToFile(scene, scenePath);

  // Now add AnimatedSprite2D
  addNode({ scene_path: scenePath, parent_node_name: name, node_type: "AnimatedSprite2D", node_name: "AnimatedSprite2D" });

  // Add CollisionShape2D
  addNode({ scene_path: scenePath, parent_node_name: name, node_type: "CollisionShape2D", node_name: "CollisionShape2D" });

  // ── Generate sprite sheet placeholder SVG ──
  const spriteDir = path.resolve(project_path, "assets", "spritesheets");
  if (!fs.existsSync(spriteDir)) fs.mkdirSync(spriteDir, { recursive: true });
  const sheetPath = path.join(spriteDir, `${name}_sheet.svg`);

  // Generate a placeholder sprite sheet showing frame layout
  const svgLines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}">`,
    `<rect width="${sheetWidth}" height="${sheetHeight}" fill="#333"/>`,
    // Grid lines
    ...(() => {
      const lines: string[] = [];
      for (let c = 0; c <= cols; c++) {
        const x = c * cellW;
        lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${sheetHeight}" stroke="#555" stroke-width="1"/>`);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * cellH;
        lines.push(`<line x1="0" y1="${y}" x2="${sheetWidth}" y2="${y}" stroke="#555" stroke-width="1"/>`);
      }
      return lines;
    })(),
    // Frame labels
    ...animDefs.reduce((lines, anim, ai) => {
      const startFrame = animDefs.slice(0, ai).reduce((s, a) => s + a.frames, 0);
      for (let f = 0; f < anim.frames; f++) {
        const idx = startFrame + f;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        lines.push(
          `<text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#888" font-size="14" font-family="monospace">${anim.name}</text>`,
          `<text x="${cx}" y="${cy + 8}" text-anchor="middle" fill="#666" font-size="12" font-family="monospace">frame ${f + 1}/${anim.frames}</text>`
        );
      }
      return lines;
    }, [] as string[]),
    `</svg>`,
  ];
  fs.writeFileSync(sheetPath, svgLines.join("\n"), "utf-8");

  // ── Generate sprite sheet configuration file ──
  const sheetConfig = [
    `# Sprite Sheet config for ${name}`,
    `# Generated by godot-mcp-server`,
    `# Replace the placeholder spritesheet with actual frames`,
    ``,
    `[sheet]`,
    `path = "res://assets/spritesheets/${name}_sheet.png"`,
    `frame_width = ${frame_width}`,
    `frame_height = ${frame_height}`,
    `columns = ${cols}`,
    `rows = ${rows}`,
    ``,
    `# Animation frames (0-indexed within the sheet)`,
    animDefs.map(a => {
      const startFrame = animDefs.slice(0, animDefs.indexOf(a)).reduce((s, ad) => s + ad.frames, 0);
      const frames = Array.from({ length: a.frames }, (_, i) => startFrame + i).join(", ");
      return `[animation.${a.name}]\nframes = [${frames}]\nfps = ${a.fps}\nloop = ${a.loop ? "true" : "false"}`;
    }).join("\n\n"),
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(spriteDir, `${name}_sheet.cfg`), sheetConfig, "utf-8");

  return [
    `Generated animation system: ${name}`,
    `  Scene: scenes/characters/${name}.tscn`,
    `  Script: scripts/characters/${name}.gd`,
    `  Sprite sheet: assets/spritesheets/${name}_sheet.svg (placeholder)`,
    `  Config: assets/spritesheets/${name}_sheet.cfg`,
    ``,
    `Animations:`,
    animDefs.map(a => `  ${a.name}: ${a.frames} frame(s) @ ${a.fps} fps ${a.loop ? "(loop)" : ""}`).join("\n"),
    ``,
    `Total frames: ${totalFrames}`,
    `Sheet layout: ${cols}x${rows} grid (${cellW.toFixed(0)}x${cellH.toFixed(0)}px per frame)`,
    ``,
    `How to add art:`,
    `  1. Use generate_sprite to create a character image`,
    `  2. In an image editor, create a sprite sheet following the grid:`,
    animDefs.reduce((lines, a) => {
      const startFrame = animDefs.slice(0, animDefs.indexOf(a)).reduce((s, ad) => s + ad.frames, 0);
      const endFrame = startFrame + a.frames - 1;
      const startCol = startFrame % cols;
      const startRow = Math.floor(startFrame / cols);
      const endCol = endFrame % cols;
      const endRow = Math.floor(endFrame / cols);
      lines.push(`     ${a.name}: cells (${startCol},${startRow}) to (${endCol},${endRow}) — ${a.frames} frames`);
      return lines;
    }, [] as string[]).join("\n"),
    `  3. Save as PNG in assets/spritesheets/${name}_sheet.png`,
    `  4. In Godot, set AnimatedSprite2D > SpriteFrames to use the sheet`,
    `  5. Define each animation's frames in the SpriteFrames editor`,
    ``,
    `Controls: Arrow keys to move, Shift to run, Down to crouch, Space to jump`,
  ].join("\n");
}
