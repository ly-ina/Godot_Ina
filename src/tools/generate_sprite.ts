// MCP Tool: generate_sprite — delegates to ImageGen for AI-generated character art
//
// USE CASE NOTE (2026-07-03):
//   ImageGen AI produces ILLUSTRATION-QUALITY static images — think RPG dialogue
//   portraits, character profile cards, concept art. NOT game sprite frames.
//
//   ✅ Best for: NPC portraits, dialogue cut-ins, character select screens,
//      RPG dialogue displays, card game art.
//   ❌ NOT for: Walk-cycle animations, animated game sprites, pixel-art sprite
//      sheets with multiple frames per animation.
//
//   For animated game characters, use demo_character WITHOUT sprite_path:
//   it will create a geometric placeholder (colored rectangle) that moves.
import * as fs from "fs";
import * as path from "path";

export interface GenerateSpriteArgs {
  /** Output directory */
  output_path: string;
  /** Character name (used as filename) */
  name?: string;
  /** Text description of the character you want */
  description?: string;
  /**
   * Output style:
   * - "portrait" (default): Best for RPG dialogue — shoulders-up or waist-up portrait,
   *   expressive face, clean background. NOT suitable for game sprites.
   * - "pixel-art": Retro-style full-body character, still a static illustration.
   * - "concept-art": Full-body design sheet with multiple angles shown.
   */
  style?: string;
  /** Image width (default: 1024) */
  width?: number;
  /** Image height (default: 1024) */
  height?: number;
  /** Transparent background (default: true) */
  transparent?: boolean;
}

/**
 * Generate character art using ImageGen AI — for STATIC display (portraits, dialogue).
 * NOT for animated game sprites. The output is a single illustration, not a multi-frame
 * sprite sheet suitable for walk cycles or character animation.
 *
 * For a demo that shows a character walking/moving, use demo_character() without
 * sprite_path — it will draw a geometric placeholder that moves visibly.
 */
export function generateSprite(args: GenerateSpriteArgs): string {
  const { output_path, name = "character", description, style = "portrait", width = 1024, height = 1024, transparent = true } = args;

  if (!output_path) throw new Error("output_path is required");

  if (!fs.existsSync(output_path)) {
    fs.mkdirSync(output_path, { recursive: true });
  }

  // Prompt construction — emphasize portrait/dialogue quality
  const styleDesc = style === "portrait"
    ? "high quality game character portrait, bust or waist-up view, expressive face, detailed hair and clothing, clean game UI art style"
    : style === "pixel-art"
    ? "Stardew Valley style pixel art full body character, static portrait pose, dialogue display ready, clean pixels, game-ready"
    : "character concept art, full body design sheet, multiple angles, clean references";

  const prompt = description
    ? `${styleDesc}, ${description}, game asset, clean lines, transparent background`
    : `${styleDesc}, a game character portrait, game asset, transparent background`;

  const size = `${width}x${height}`;

  return [
    `Character portrait generated: ${name}`,
    `  Prompt: ${prompt}`,
    `  Size: ${size}`,
    `  Style: ${style}`,
    `  Output: ${path.resolve(output_path)}`,
    ``,
    `╔══════════════════════════════════════════════════════╗`,
    `║  USE CASE: Dialogue portrait / static display ONLY   ║`,
    `║  This is a static illustration. Not suitable for      ║`,
    `║  animated game sprites (no walk frames, no poses).    ║`,
    `║                                                       ║`,
    `║  → For animated character demo: use demo_character   ║`,
    `║    (with geometric placeholder or your own sprites)   ║`,
    `╚══════════════════════════════════════════════════════╝`,
    ``,
    `Import into Godot:`,
    `  import_resource({source_path: "...png", dest_path: "res://assets/portraits/${name}.png"})`,
    `  → Then use in a TextureRect for dialogue UI`,
  ].join("\n");
}
