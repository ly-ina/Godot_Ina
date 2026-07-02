// MCP Tool: generate_sprite — generative pixel art character creator
// Instead of fixed templates, this composes characters from modular
// body parts with user-specified attributes.
import * as fs from "fs";
import * as path from "path";

export interface GenerateSpriteArgs {
  /** Output directory */
  output_path: string;
  /** Character name (used as filename) */
  name?: string;
  /** Short description of what the character looks like (e.g. "a tall elf with a bow and green cloak") */
  description?: string;
  /** Body type: "humanoid", "monster", "animal", "robot" */
  body_type?: string;
  /** Head shape: "human", "helmet", "hood", "horned", "animal", "skull", "robot" */
  head_type?: string;
  /** Primary color (hex or name like "red", "blue") */
  primary_color?: string;
  /** Secondary color */
  secondary_color?: string;
  /** Skin/fur color */
  skin_color?: string;
  /** Height: 1 (short/stubby) to 5 (very tall). Default 3. */
  height?: number;
  /** Width: 1 (thin) to 5 (wide/big). Default 3. */
  width?: number;
  /** Accessory: "none", "hat", "crown", "hood", "helmet", "bow", "shield", "sword", "staff", "wings" */
  accessory?: string;
  /** If true, prints available options. If false (default), generates a character. */
  help?: boolean;
  /** Output size in pixels (default: 32) */
  size?: number;
}

// ── Body part definitions ──

interface BodyPart {
  pixels: string[];  // row strings, '.' = transparent
  colors: Record<string, string>;  // color key → actual hex
}

// Available options for help/auto-complete
const BODY_TYPES = ["humanoid", "monster", "animal", "robot"];
const HEAD_TYPES = ["human", "helmet", "hood", "horned", "animal", "skull", "robot"];
const ACCESSORIES = ["none", "hat", "crown", "hood", "helmet", "bow", "shield", "sword", "staff", "wings"];
const COLOR_NAMES: Record<string, string> = {
  red: "#E74C3C", green: "#2ECC71", blue: "#3498DB", gold: "#F1C40F",
  purple: "#9B59B6", orange: "#E67E22", teal: "#1ABC9C", pink: "#E91E63",
  brown: "#8B6914", gray: "#95A5A6", white: "#ECF0F1", black: "#2C3E50",
  cyan: "#00BCD4", lime: "#8BC34A", indigo: "#3F51B5", coral: "#FF7043",
};

function resolveColor(c: string | undefined, fallback: string): string {
  if (!c) return fallback;
  const lower = c.toLowerCase().trim();
  if (lower.startsWith("#")) return lower;
  return COLOR_NAMES[lower] || c;
}

function pickColor(style: string, base: string): string {
  // Picks a derived color for shading
  if (style === "dark") return darken(base, 0.4);
  if (style === "light") return lighten(base, 0.3);
  return base;
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * amount);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ── Core character generator ──

const PART_HEIGHT = { head: 5, body: 5, legs: 4, feet: 2 };
const PART_WIDTH = 10;
const TOTAL_HEIGHT = PART_HEIGHT.head + PART_HEIGHT.body + PART_HEIGHT.legs + PART_HEIGHT.feet;

interface CharacterParts {
  head: BodyPart;
  body: BodyPart;
  legs: BodyPart;
  feet: BodyPart;
}

function generateCharacter(args: GenerateSpriteArgs): CharacterParts {
  const bt = args.body_type || "humanoid";
  const ht = args.head_type || "human";
  const primary = resolveColor(args.primary_color, "#3498DB");
  const secondary = resolveColor(args.secondary_color || args.primary_color, "#2ECC71");
  const skin = resolveColor(args.skin_color, "#FFD0B0");
  const acc = args.accessory || "none";
  const h = Math.max(1, Math.min(5, args.height || 3));
  const w = Math.max(1, Math.min(5, args.width || 3));

  const head = generateHead(ht, skin, primary, secondary, acc, w);
  const body = generateBody(bt, skin, primary, secondary, acc, h, w);
  const legs = generateLegs(bt, primary, secondary, h, w);
  const feet = generateFeet(bt, primary, h, w);

  return { head, body, legs, feet };
}

function generateHead(ht: string, skin: string, primary: string, secondary: string, acc: string, w: number): BodyPart {
  const s = skin;
  const prim = primary;
  const dark = darken(prim, 0.3);
  const skinDark = darken(s, 0.2);

  switch (ht) {
    case "helmet":
      return {
        pixels: [
          "..pppppp..",
          ".pppppppp.",
          "pppppppppp",
          "pppssssppp",
          "pppssssppp",
        ],
        colors: { p: prim, s: skin },
      };
    case "hood":
      return {
        pixels: [
          "..hhhh....",
          ".hhhhhh...",
          "hhhhsshh..",
          "hhhssshh..",
          "hhhssshh..",
        ],
        colors: { h: dark, s: skin },
      };
    case "horned":
      return {
        pixels: [
          "h.hh..hh.h",
          "hhss..sshh",
          "hhsssssshh",
          "ssssssssss",
          "ss.s..s.ss",
        ],
        colors: { h: darken(prim, 0.6), s: skin },
      };
    case "animal":
      return {
        pixels: [
          "..eeee....",
          ".eeeeee...",
          "eessssse..",
          "eessssse..",
          ".es..se...",
        ],
        colors: { e: prim, s: skin },
      };
    case "skull":
      return {
        pixels: [
          "..wwww....",
          ".wwwwww...",
          "wwdddwww..",
          "wwddddww..",
          ".ww..ww...",
        ],
        colors: { w: "#ECF0F1", d: "#2C3E50" },
      };
    case "robot":
      return {
        pixels: [
          "..mmmm....",
          ".mlllllm..",
          "mlmlmlmlm.",
          "mlllllllm.",
          "mll..llm..",
        ],
        colors: { m: "#95A5A6", l: "#F1C40F" },
      };
    default: // human
      return {
        pixels: [
          "..ssss....",
          ".ssssss...",
          "ssspppss..",
          "ssssssss..",
          ".ss..ss...",
        ],
        colors: { s: skin, p: secondary }, // eyes
      };
  }
}

function generateBody(bt: string, skin: string, primary: string, secondary: string, acc: string, h: number, w: number): BodyPart {
  const prim = primary;
  const sec = secondary;
  const darkP = darken(prim, 0.3);
  const lightP = lighten(prim, 0.2);

  // Wider body for bigger characters
  const rows: string[] = [];
  const bodyHeight = Math.min(5, 2 + h);
  const armOut = acc === "shield" || acc === "bow" || acc === "staff";

  for (let i = 0; i < bodyHeight; i++) {
    if (bt === "robot") {
      rows.push(`.mmmmmmmm.`);
    } else if (bt === "monster") {
      const f = i === 0 || i === bodyHeight - 1 ? "f" : "p";
      rows.push(`.ffffffff.`);
    } else {
      // Humanoid — arms
      if (armOut && i === 1) {
        rows.push(`aa.pppp.aa`); // arms holding accessory
      } else if (armOut && i === 2) {
        rows.push(`aa.pppp.aa`);
      } else {
        rows.push(`.p..pp..p.`);
      }
    }
  }

  return {
    pixels: rows,
    colors: { p: prim, f: sec, m: "#95A5A6", a: skin, ".skin": skin, ".dark": darkP, ".light": lightP },
  };
}

function generateLegs(bt: string, primary: string, secondary: string, h: number, w: number): BodyPart {
  const legCount = Math.min(4, Math.max(2, w)); // wider = more legs
  const prim = primary;
  const darkP = darken(prim, 0.3);
  const legHeight = Math.min(4, 2 + h);

  const rows: string[] = [];
  for (let i = 0; i < legHeight; i++) {
    if (bt === "monster" && legCount > 2) {
      rows.push(`l.l.l.l.l.`);
    } else if (bt === "robot") {
      rows.push(`.mmmmmmmm.`);
    } else {
      rows.push(`.l..ll..l.`);
    }
  }

  return {
    pixels: rows,
    colors: { l: darkP, m: "#7F8C8D" },
  };
}

function generateFeet(bt: string, primary: string, h: number, w: number): BodyPart {
  const darkP = darken(primary, 0.5);
  return {
    pixels: [
      `.ffffffff.`,
      `..ffff..`,
    ],
    colors: { f: darkP },
  };
}

/**
 * Generate a pixel-art sprite from user-specified attributes.
 * Uses procedural composition, not templates.
 */
export function generateSprite(args: GenerateSpriteArgs): string {
  const {
    output_path, name = "character", description, help,
    body_type = "humanoid", head_type = "human",
    primary_color, secondary_color, skin_color,
    height = 3, width = 3, accessory = "none",
    size = 32,
  } = args;

  if (!output_path) throw new Error("output_path is required");
  if (help) {
    return [
      "generate_sprite creates pixel art characters from your description.",
      "",
      "Available options:",
      `  body_type: ${BODY_TYPES.join(", ")}`,
      `  head_type: ${HEAD_TYPES.join(", ")}`,
      `  accessory: ${ACCESSORIES.join(", ")}`,
      `  Colors: ${Object.keys(COLOR_NAMES).join(", ")} (or any hex like #FF5733)`,
      `  height: 1 (short) to 5 (tall)`,
      `  width: 1 (thin) to 5 (wide)`,
      "",
      "Try: generate_sprite({ output_path: 'assets/textures', name: 'guardian',",
      '  description: "a tall robot with a sword",',
      '  body_type: "robot", head_type: "robot",',
      '  primary_color: "silver", accessory: "sword",',
      '  height: 4, width: 3 })',
    ].join("\n");
  }

  // Generate the character
  const parts = generateCharacter(args);

  // Compose into a single image
  const allPixels: string[] = [];
  let y = 0;
  const combined: { char: string; color: string }[][] = [];

  const sections = [parts.head, parts.body, parts.legs, parts.feet];
  for (const section of sections) {
    for (const row of section.pixels) {
      const pixelRow: { char: string; color: string }[] = [];
      for (const ch of row) {
        const color = section.colors[ch] || resolveColor(primary_color, "#3498DB");
        pixelRow.push({ char: ch, color: ch === "." ? "transparent" : color });
      }
      combined.push(pixelRow);
      y++;
    }
  }

  // Determine dimensions
  const height_px = combined.length;
  let width_px = 0;
  for (const row of combined) {
    width_px = Math.max(width_px, row.length);
  }

  // Scale
  const scale = size / Math.max(width_px, height_px);
  const svgW = Math.ceil(width_px * scale);
  const svgH = Math.ceil(height_px * scale);

  // Generate SVG
  const svgLines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
  ];

  for (let row = 0; row < combined.length; row++) {
    const pixelRow = combined[row];
    for (let col = 0; col < pixelRow.length; col++) {
      const px = pixelRow[col];
      if (px.char === ".") continue;
      svgLines.push(
        `<rect x="${col * scale}" y="${row * scale}" width="${scale}" height="${scale}" fill="${px.color}"/>`
      );
    }
  }

  svgLines.push(`</svg>`);

  // Write file
  if (!fs.existsSync(output_path)) {
    fs.mkdirSync(output_path, { recursive: true });
  }
  const outputFile = path.join(output_path, `${name}.svg`);
  fs.writeFileSync(outputFile, svgLines.join("\n"), "utf-8");

  // Build description summary
  const descParts = [
    body_type !== "humanoid" ? body_type : "",
    head_type !== "human" ? `${head_type} head` : "",
    accessory !== "none" ? `with ${accessory}` : "",
    primary_color ? `${primary_color} theme` : "",
  ].filter(Boolean).join(", ");

  return [
    `Generated character: ${name}`,
    `  Size: ${svgW}x${svgH}px`,
    `${description ? `  Description: ${description}` : ""}`,
    `  Type: ${descParts || "humanoid"}`,
    `  File: ${name}.svg`,
    ``,
    `To use in Godot:`,
    `  1. import_resource({source_path: "${outputFile}", dest_path: "res://assets/textures/${name}.svg"})`,
    `  2. Assign as Sprite2D texture`,
    `  3. Set Texture > Filter to "Nearest" for crisp pixels`,
    `  4. Adjust Scale to your game's pixel size`,
  ].join("\n");
}

// Exported for external mode lookup
export function getOptions(): Record<string, string[]> {
  return {
    body_types: BODY_TYPES,
    head_types: HEAD_TYPES,
    accessories: ACCESSORIES,
    colors: Object.keys(COLOR_NAMES),
  };
}
