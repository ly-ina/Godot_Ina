// MCP Tool: generate_sprite — generate pixel-art style sprites as SVG
// These SVG files work directly in Godot as texture resources.
import * as fs from "fs";
import * as path from "path";

export interface GenerateSpriteArgs {
  /** Path to the Godot project root or output directory */
  output_path: string;
  /** Character type */
  character: "player" | "enemy_slime" | "enemy_skeleton" | "npc_villager" | "item_coin" | "item_heart" | "item_sword" | "projectile";
  /** Color theme: "default", "red", "blue", "green", "gold", "purple" (default: "default") */
  color_theme?: string;
  /** Output filename (without extension, default: auto-generated) */
  filename?: string;
  /** Sprite size in pixels (default: 16 for 16x16) */
  size?: number;
  /** Output format: "svg" (default, works in Godot) */
  format?: "svg";
}

const COLOR_THEMES: Record<string, { primary: string; secondary: string; accent: string; dark: string }> = {
  default: { primary: "#4A90D9", secondary: "#6BB3F0", accent: "#F5A623", dark: "#2C5F8A" },
  red: { primary: "#D94A4A", secondary: "#F06B6B", accent: "#FFD700", dark: "#8A2C2C" },
  blue: { primary: "#3B82C4", secondary: "#5A9FD6", accent: "#FFD700", dark: "#25537A" },
  green: { primary: "#4CAF50", secondary: "#6BC46E", accent: "#FFD700", dark: "#2E7D32" },
  gold: { primary: "#D4A017", secondary: "#E8C34A", accent: "#FFFFFF", dark: "#8B6914" },
  purple: { primary: "#7B4AC9", secondary: "#9B6BEA", accent: "#FFD700", dark: "#4C2C7A" },
};

const CHARACTERS: Record<string, { width: number; height: number; pixels: string; frames: number }> = {
  player: {
    width: 12, height: 16, frames: 1,
    pixels: [
      // 16x12 each — player character (top-down perspective)
      "....000000....",
      "...0cccccc0...",
      "..0cccccccc0..",
      "..0cbbbbcbb0..",
      "..0cbbbbcbb0..",
      ".00aaaaaaaa00.",
      "0aa22222222aa0",
      "0a2aaaaaaa2a0",
      "0aa22222222aa0",
      "..0a22a22a0..",
      "..0aaa0aaa0..",
      ".00aa00aa00.",
      "0aa00aa00aa00",
      "0a000aa000a00",
      "0a000aa000a00",
      "000..000..000",
    ].join("\n"),
  },
  enemy_slime: {
    width: 12, height: 10, frames: 1,
    pixels: [
      "....pppp....",
      "...pppppp...",
      "..pppppppp..",
      "..pppdppdp..",
      ".pppppppppp.",
      ".pppppppppp.",
      "pppppppppppp",
      "pppppppppppp",
      ".pppp..pppp.",
      "..pp....pp..",
    ].join("\n"),
  },
  enemy_skeleton: {
    width: 10, height: 14, frames: 1,
    pixels: [
      "...wwww...",
      "..wwwww..",
      ".wwdddwww.",
      "wwddddddww",
      "wwddddddww",
      "..00..00..",
      "..0dddd0..",
      ".00dddd00.",
      "0w0dddd0w0",
      "0ww0dd0ww0",
      ".0wwddww0.",
      ".w0wddw0w.",
      "w00w..w00w",
      "0..0..0..0",
    ].join("\n"),
  },
  npc_villager: {
    width: 12, height: 16, frames: 1,
    pixels: [
      "....aaaa....",
      "...aaaaaa...",
      "..aaaaaaaa..",
      "..aadddada..",
      "..aadddada..",
      ".00bbbbbb00.",
      "0bbbbbbbbbb0",
      "0bbccbbccbb0",
      "0bbbbbbbbbb0",
      "..0bbbbbb0..",
      "..0b00b0b0..",
      ".00bb00bb00.",
      "0bb00bb00bb0",
      "0b00bb00bb00",
      "0b00bb00bb00",
      "000..000..000",
    ].join("\n"),
  },
  item_coin: {
    width: 8, height: 8, frames: 1,
    pixels: [
      "...yy...",
      ".yyyyyy.",
      ".yyyyyy.",
      "yyyyyyyy",
      "yyyyyyyy",
      ".yyffyy.",
      ".yyyyyy.",
      "...yy...",
    ].join("\n"),
  },
  item_heart: {
    width: 8, height: 8, frames: 1,
    pixels: [
      ".rr..rr.",
      "rrrrrrrr",
      "rrrrrrrr",
      "rrrrrrrr",
      ".rrrrrr.",
      "..rrrr..",
      "...rr...",
      "....r...",
    ].join("\n"),
  },
  item_sword: {
    width: 6, height: 12, frames: 1,
    pixels: [
      "..ss..",
      ".sss..",
      "..ss..",
      "..ss..",
      "..ss..",
      "..ss..",
      "..ss..",
      "..ss..",
      "..ss..",
      ".sss..",
      "sssss.",
      ".sss..",
    ].join("\n"),
  },
  projectile: {
    width: 6, height: 6, frames: 1,
    pixels: [
      "..ff..",
      ".ffff.",
      "ffffff",
      "ffffff",
      ".ffff.",
      "..ff..",
    ].join("\n"),
  },
};

/**
 * Generate a pixel-art style sprite as an SVG file.
 * The SVG can be imported directly into Godot as a texture.
 */
export function generateSprite(args: GenerateSpriteArgs): string {
  const { output_path, character, color_theme = "default", filename, size = 16, format = "svg" } = args;

  if (!output_path) throw new Error("output_path is required");
  if (!fs.existsSync(output_path)) {
    fs.mkdirSync(output_path, { recursive: true });
  }

  const charData = CHARACTERS[character];
  if (!charData) {
    throw new Error(`Unknown character type: "${character}". Available: ${Object.keys(CHARACTERS).join(", ")}`);
  }

  const colors = COLOR_THEMES[color_theme] || COLOR_THEMES.default;
  const charName = filename || character;
  const outputFile = path.join(output_path, `${charName}.svg`);

  // Parse pixel map
  const lines = charData.pixels.split("\n").filter(l => l.trim());
  const pxH = lines.length;
  const pxW = charData.width;

  // Scale factor
  const scale = size / Math.max(pxW, pxH);

  // Generate SVG
  const svgParts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW * scale}" height="${pxH * scale}" viewBox="0 0 ${pxW * scale} ${pxH * scale}">`,
    `<rect width="${pxW * scale}" height="${pxH * scale}" fill="transparent"/>`,
  ];

  for (let y = 0; y < lines.length; y++) {
    const row = lines[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue; // transparent

      let fill: string;
      switch (ch) {
        case "p": fill = colors.primary; break;     // primary body
        case "s": fill = colors.secondary; break;    // secondary/highlight
        case "d": fill = colors.dark; break;         // dark/shadow
        case "a": fill = colors.accent; break;       // accent
        case "0": fill = "#000000"; break;           // outline
        case "b": fill = "#8B6914"; break;           // brown (skin/wood)
        case "c": fill = "#FFD0B0"; break;           // skin
        case "r": fill = "#E74C3C"; break;           // red
        case "g": fill = "#2ECC71"; break;           // green
        case "y": fill = "#F1C40F"; break;           // yellow/gold
        case "f": fill = "#F39C12"; break;           // orange/fire
        case "w": fill = "#ECF0F1"; break;           // white/bone
        case "x": fill = "#95A5A6"; break;           // gray
        default: fill = colors.primary; break;
      }

      svgParts.push(
        `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`
      );
    }
  }

  svgParts.push(`</svg>`);

  fs.writeFileSync(outputFile, svgParts.join("\n"), "utf-8");

  return [
    `Generated sprite: ${charName}`,
    `  Type: ${character}`,
    `  Size: ${Math.round(pxW * scale)}x${Math.round(pxH * scale)}px (pixel scale: ${scale}x)`,
    `  Colors: ${color_theme} theme`,
    `  File: ${path.relative(output_path, outputFile)}`,
    ``,
    `To use in Godot:`,
    `  1. Import the SVG into your project (drag & drop or import_resource)`,
    `  2. Assign as texture to a Sprite2D node`,
    `  3. In the Sprite2D inspector, set Texture > Filter to "Nearest" for crisp pixels`,
  ].join("\n");
}

export function getCharacterList(): string[] {
  return Object.keys(CHARACTERS);
}

export function getThemeList(): string[] {
  return Object.keys(COLOR_THEMES);
}
