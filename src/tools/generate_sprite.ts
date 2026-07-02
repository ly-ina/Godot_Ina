// MCP Tool: generate_sprite — Stardew Valley-quality pixel art generator
// Composes characters from layered modular parts with proper shading.
import * as fs from "fs";
import * as path from "path";

export interface GenerateSpriteArgs {
  output_path: string;
  name?: string;
  /** Body type */
  body_type?: "human" | "child" | "muscular" | "plump";
  /** Hair style */
  hair?: "short" | "long" | "twin_tail" | "ponytail" | "bob" | "bald";
  /** Hair color (hex) */
  hair_color?: string;
  /** Skin color (hex) */
  skin_color?: string;
  /** Top clothing: "shirt", "jacket", "vest", "robe", "armor" */
  top?: string;
  /** Top color */
  top_color?: string;
  /** Bottom: "pants", "skirt", "shorts" */
  bottom?: string;
  /** Bottom color */
  bottom_color?: string;
  /** Shoe color */
  shoe_color?: string;
  /** Eye color */
  eye_color?: string;
  /** Head accessory: "none", "hat", "ribbon", "crown", "glasses" */
  headwear?: string;
  /** Held item: "none", "sword", "staff", "book", "flower" */
  hold?: string;
  /** Expression: "neutral", "happy", "angry" */
  expression?: string;
  /** Scale per pixel (default: 3) */
  scale?: number;
  /** If true, lists all options */
  help?: boolean;
}

// ── Color utilities ──

function hex(c: string | undefined | null, fallback = "#888"): string {
  if (!c) return fallback;
  const cleaned = c.trim().toLowerCase();
  if (cleaned.startsWith("#")) return cleaned;
  const named: Record<string, string> = {
    red: "#E74C3C", green: "#2ECC71", blue: "#3498DB", gold: "#F1C40F",
    purple: "#9B59B6", orange: "#E67E22", teal: "#1ABC9C", pink: "#E91E63",
    brown: "#8B6914", gray: "#95A5A6", white: "#ECF0F1", black: "#2C3E50",
    cyan: "#00BCD4", lime: "#8BC34A", coral: "#FF7043", indigo: "#3F51B5",
    blonde: "#F4D03F", auburn: "#A0522D", silver: "#BDC3C7",
  };
  return named[cleaned] || fallback;
}

function shade(hexColor: string | undefined, amount: number): string {
  const c = hexColor || "#888";
  const r = Math.max(0, Math.min(255, parseInt(c.slice(1, 3), 16) + amount * 255));
  const g = Math.max(0, Math.min(255, parseInt(c.slice(3, 5), 16) + amount * 255));
  const b = Math.max(0, Math.min(255, parseInt(c.slice(5, 7), 16) + amount * 255));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ── Pixel data ──

interface SpriteBuffer {
  w: number;
  h: number;
  pixels: string[][]; // [y][x] = hex color or "" for transparent
}

function createBuffer(w: number, h: number): SpriteBuffer {
  const pixels: string[][] = [];
  for (let y = 0; y < h; y++) {
    pixels.push(new Array(w).fill(""));
  }
  return { w, h, pixels };
}

function setPx(buf: SpriteBuffer, x: number, y: number, color: string) {
  if (x >= 0 && x < buf.w && y >= 0 && y < buf.h) {
    buf.pixels[y][x] = color;
  }
}

function draw(buf: SpriteBuffer, data: string[], palette: Record<string, string>, ox = 0, oy = 0) {
  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (color) setPx(buf, ox + x, oy + y, color);
    }
  }
}

// ── Body parts ──

function drawOutline(buf: SpriteBuffer, bt: string, skinHex: string) {
  // Body shape data: 16 wide, height varies
  // '.' = transparent, 's' = skin, 'o' = outline
  const skin = hex(skinHex, "#F5E6D0");
  const darkSkin = shade(skin, -0.25);
  const outline = "#2C2C2C";

  // Head (rows 0-5)
  const head = [
    "........",
    "..ssss..",
    ".ssssss.",
    "ssssssss",
    "ssssssss",
    ".ss..ss.",
  ];
  for (let y = 0; y < head.length; y++) {
    const row = head[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "s") setPx(buf, 4 + x, y, skin);
    }
  }
  // Head outline
  setPx(buf, 4, 1, outline); setPx(buf, 11, 1, outline);
  setPx(buf, 3, 2, outline); setPx(buf, 12, 2, outline);
  setPx(buf, 3, 3, outline); setPx(buf, 12, 3, outline);
  setPx(buf, 3, 4, outline); setPx(buf, 12, 4, outline);
  setPx(buf, 4, 5, outline); setPx(buf, 11, 5, outline);

  // Body (rows 6-15)
  let torsoW = 10;
  const bodyStart = 6;
  const bodyEnd = bt === "child" ? 12 : 15;
  const bodyLen = bodyEnd - bodyStart + 1;

  for (let y = 0; y < bodyLen; y++) {
    const rowIdx = bodyStart + y;
    const t = y / bodyLen; // 0..1 top to bottom
    const bw = bt === "child" ? 8 : bt === "muscular" ? 12 : bt === "plump" ? 12 : 10;
    const bx = (16 - bw) / 2;
    for (let x = 0; x < bw; x++) {
      setPx(buf, bx + x, rowIdx, "#D4D4D4"); // placeholder body fill
    }
    // body outline
    setPx(buf, bx - 1, rowIdx, outline);
    setPx(buf, bx + bw, rowIdx, outline);
  }

  return { skin, darkSkin, outline };
}

// ── Main character generation ──

function generateChar(args: GenerateSpriteArgs): SpriteBuffer {
  const bt = args.body_type || "human";
  const buf = createBuffer(16, 24);

  const skin = hex(args.skin_color, "#F5E6D0");
  const darkSkin = shade(skin, -0.25);
  const hair = hex(args.hair_color, "#3D2B1F");
  const hairLight = shade(hair, 0.2);
  const hairDark = shade(hair, -0.25);
  const eyeC = hex(args.eye_color, "#5D4037");
  const topC = hex(args.top_color, "#4A90D9");
  const topLight = shade(topC, 0.25);
  const topDark = shade(topC, -0.25);
  const botC = hex(args.bottom_color || args.top_color, "#34495E");
  const botDark = shade(botC, -0.25);
  const shoeC = hex(args.shoe_color, "#2C3E50");
  const outline = "#2C2C2C";

  // ── HEAD (rows 0-5) ──
  const headPixels: string[][] = [];
  const headRows = [
    "........",
    "..ssss..",
    ".ssssss.",
    "ssssssss",
    "ssssssss",
    ".ss..ss.",
  ];
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 8; x++) {
      const ch = headRows[y][x];
      if (ch === ".") continue;
      setPx(buf, 4 + x, y, ch === "s" ? skin : outline);
    }
  }
  // Head outline
  [[4,1],[11,1],[3,2],[12,2],[3,3],[12,3],[3,4],[12,4],[4,5],[11,5]].forEach(([x,y]) => setPx(buf, x, y, outline));
  // Skin shade on right side
  for (let y = 2; y <= 4; y++) setPx(buf, 11, y, darkSkin);

  // ── Eyes (row 3) ──
  setPx(buf, 6, 3, eyeC); setPx(buf, 9, 3, eyeC);
  // Eye highlights
  setPx(buf, 6, 3, shade(eyeC, 0.4)); setPx(buf, 9, 3, shade(eyeC, 0.4));

  // ── Expression ──
  const expr = args.expression || "neutral";
  if (expr === "happy") {
    setPx(buf, 7, 4, skin); setPx(buf, 8, 4, skin); // open mouth smile
  } else if (expr === "angry") {
    setPx(buf, 5, 3, outline); setPx(buf, 10, 3, outline); // angled brows
  }

  // ── HAIR ──
  const hStyle = args.hair || "long";
  const hairData = getHairData(hStyle);
  for (let y = 0; y < hairData.length; y++) {
    for (let x = 0; x < hairData[y].length; x++) {
      const ch = hairData[y][x];
      if (ch === ".") continue;
      const c = ch === "h" ? hair : ch === "l" ? hairLight : ch === "d" ? hairDark : outline;
      setPx(buf, x, y, c);
    }
  }

  // ── BODY (rows 6-15), using layered system ──
  const top = args.top || "shirt";
  const bottom = args.bottom || "pants";

  // Draw body silhouette
  if (bt === "child") {
    // Narrower torso for child
    for (let y = 6; y <= 12; y++) {
      for (let x = 5; x <= 10; x++) setPx(buf, x, y, topC);
    }
  } else {
    // Adult torso
    for (let y = 6; y <= 14; y++) {
      const startX = bt === "plump" ? 3 : 4;
      const endX = bt === "plump" ? 12 : bt === "muscular" ? 12 : 11;
      for (let x = startX; x <= endX; x++) {
        setPx(buf, x, y, topC);
      }
    }
    // Neck
    setPx(buf, 7, 6, topC); setPx(buf, 8, 6, topC);
  }

  // Top clothing details
  if (top === "jacket") {
    // Jacket outline
    for (let y = 7; y <= 14; y++) {
      setPx(buf, 3, y, topDark); setPx(buf, 12, y, topDark);
    }
    // Collar
    setPx(buf, 6, 7, topLight); setPx(buf, 9, 7, topLight);
    // Buttons
    for (let y = 9; y <= 13; y += 2) { setPx(buf, 7, y, topDark); setPx(buf, 8, y, topDark); }
  } else if (top === "robe") {
    // Long robe extends over legs
    for (let y = 6; y <= 18; y++) {
      for (let x = 4; x <= 11; x++) setPx(buf, x, y, topC);
    }
    // Belt
    for (let x = 5; x <= 10; x++) setPx(buf, 14, x, shoeC);
  } else if (top === "vest") {
    // Vest over shirt - lighter color inside
    for (let y = 7; y <= 12; y++) {
      setPx(buf, 4, y, topDark); setPx(buf, 11, y, topDark);
    }
    // Shirt visible through vest
    const shirtC = shade(topC, 0.3);
    for (let y = 7; y <= 12; y++) {
      for (let x = 5; x <= 10; x++) setPx(buf, x, y, shirtC);
    }
  } else if (top === "armor") {
    // Metallic armor
    for (let y = 7; y <= 13; y++) {
      for (let x = 4; x <= 11; x++) setPx(buf, x, y, topC);
    }
    // Shoulder pads
    setPx(buf, 3, 7, topC); setPx(buf, 3, 8, topDark);
    setPx(buf, 12, 7, topC); setPx(buf, 12, 8, topDark);
    // Belt
    for (let x = 4; x <= 11; x++) setPx(buf, 13, x, "#8B6914");
  }

  // Right side shade on body
  for (let y = 7; y <= 14; y++) {
    const rightX = bt === "plump" ? 12 : bt === "muscular" ? 12 : 11;
    setPx(buf, rightX, y, topDark);
  }

  // ── ARMS ──
  const armY = 7;
  // Left arm
  setPx(buf, 2, armY, skin); setPx(buf, 2, armY + 1, skin);
  setPx(buf, 1, armY + 2, skin); setPx(buf, 2, armY + 2, skin);
  if (args.hold) {
    setPx(buf, 1, armY + 3, skin); // arm reaching down
    setPx(buf, 2, armY + 3, skin);
  }
  // Right arm
  setPx(buf, 13, armY, skin); setPx(buf, 13, armY + 1, skin);
  setPx(buf, 13, armY + 2, skin); setPx(buf, 14, armY + 2, skin);

  // ── LEGS (rows 15-23) ──
  if (bottom === "skirt") {
    // Skirt
    const skirtC = botC;
    for (let y = 15; y <= 19; y++) {
      const expand = Math.floor((y - 15) / 2);
      for (let x = 4 - expand; x <= 11 + expand; x++) {
        setPx(buf, x, y, skirtC);
      }
    }
    // Skirt shade
    for (let y = 15; y <= 19; y++) {
      const rightX = 11 + Math.floor((y - 15) / 2);
      setPx(buf, rightX, y, botDark);
    }
    // Legs below skirt
    for (let y = 20; y <= 21; y++) {
      setPx(buf, 6, y, skin); setPx(buf, 9, y, skin);
    }
    // Shoes
    setPx(buf, 5, 22, shoeC); setPx(buf, 6, 22, shoeC);
    setPx(buf, 9, 22, shoeC); setPx(buf, 10, 22, shoeC);
    setPx(buf, 5, 23, shoeC); setPx(buf, 6, 23, shoeC);
    setPx(buf, 9, 23, shoeC); setPx(buf, 10, 23, shoeC);
  } else {
    // Pants/shorts
    const legLen = bottom === "shorts" ? 3 : 8;
    // Left leg
    for (let y = 15; y < 15 + legLen; y++) {
      setPx(buf, 5, y, botC); setPx(buf, 6, y, botC);
      if (y < 15 + legLen - 1) { setPx(buf, 4, y, botC); setPx(buf, 7, y, botC); }
    }
    // Right leg
    for (let y = 15; y < 15 + legLen; y++) {
      setPx(buf, 9, y, botC); setPx(buf, 10, y, botC);
      if (y < 15 + legLen - 1) { setPx(buf, 8, y, botC); setPx(buf, 11, y, botC); }
    }
    // Leg shade
    for (let y = 15; y < 15 + legLen; y++) {
      setPx(buf, 7, y, botDark); setPx(buf, 10, y, botDark);
    }
    // Skin below legs
    for (let y = 15 + legLen; y <= 21; y++) {
      setPx(buf, 6, y, skin); setPx(buf, 7, y, skin);
      setPx(buf, 9, y, skin); setPx(buf, 10, y, skin);
    }
    // Shoes
    for (let y = 22; y <= 23; y++) {
      setPx(buf, 5, y, shoeC); setPx(buf, 6, y, shoeC);
      setPx(buf, 9, y, shoeC); setPx(buf, 10, y, shoeC);
    }
  }

  // ── HEADWEAR ──
  if (args.headwear === "hat") {
    for (let x = 3; x <= 12; x++) setPx(buf, x, 1, "#8B6914");
    setPx(buf, 3, 1, "#6B4F12"); setPx(buf, 12, 1, "#6B4F12");
    setPx(buf, 4, 0, "#8B6914"); setPx(buf, 5, 0, "#8B6914"); setPx(buf, 6, 0, "#8B6914");
    setPx(buf, 9, 0, "#8B6914"); setPx(buf, 10, 0, "#8B6914"); setPx(buf, 11, 0, "#8B6914");
  } else if (args.headwear === "ribbon") {
    setPx(buf, 5, 1, "#E74C3C"); setPx(buf, 6, 1, "#E74C3C");
    setPx(buf, 9, 1, "#E74C3C"); setPx(buf, 10, 1, "#E74C3C");
  } else if (args.headwear === "crown") {
    for (let x = 5; x <= 10; x++) setPx(buf, x, 1, "#F1C40F");
    setPx(buf, 6, 0, "#F1C40F"); setPx(buf, 9, 0, "#F1C40F");
  } else if (args.headwear === "glasses") {
    setPx(buf, 5, 3, outline); setPx(buf, 6, 3, outline);
    setPx(buf, 9, 3, outline); setPx(buf, 10, 3, outline);
    setPx(buf, 7, 3, outline); setPx(buf, 8, 3, outline);
  }

  // ── HELD ITEM ──
  if (args.hold === "sword") {
    setPx(buf, 0, 10, "#95A5A6"); setPx(buf, 0, 11, "#95A5A6");
    setPx(buf, 0, 9, "#F1C40F"); setPx(buf, 0, 8, "#F1C40F");
    setPx(buf, 0, 7, "#2C2C2C");
  } else if (args.hold === "staff") {
    setPx(buf, 0, 10, "#8B6914"); setPx(buf, 0, 11, "#8B6914");
    setPx(buf, 0, 12, "#8B6914"); setPx(buf, 0, 13, "#8B6914");
    setPx(buf, 0, 9, "#F1C40F");
  } else if (args.hold === "book") {
    setPx(buf, 1, 10, "#E74C3C"); setPx(buf, 2, 10, "#E74C3C");
    setPx(buf, 1, 11, "#C0392B"); setPx(buf, 2, 11, "#C0392B");
  } else if (args.hold === "flower") {
    setPx(buf, 1, 9, "#E74C3C"); setPx(buf, 0, 10, "#2ECC71");
    setPx(buf, 1, 10, "#2ECC71");
  }

  return buf;
}

function getHairData(style: string): string[] {
  // h = hair color, l = light highlight, d = dark shade, o = outline
  const styles: Record<string, string[]> = {
    short: [
      "....hhhh...",
      "...hhhhhh..",
      "...hhhhhh..",
      "...h....h..",
    ],
    long: [
      "....hhhh....",
      "...hhhhhh...",
      "...hllllh...",
      "...h....h...",
      "..h......h..",
      "..h......h..",
      ".h........h.",
      ".h........h.",
    ],
    twin_tail: [
      "h...h...h",
      "hh..h..hh",
      ".hh.h.hh.",
      "..hhlhh..",
      "..hh.hh..",
      ".hh..hh..",
      ".h....h..",
      "h......h.",
    ],
    ponytail: [
      "...hhhh....",
      "..hhhhhh...",
      "..hllllh...",
      "..h....h...",
      "..h....h...",
      "...hhhh....",
      "...h..h....",
      "...h..h....",
    ],
    bob: [
      "..hhhhhh..",
      ".hhhhhhhh.",
      ".hllllllh.",
      ".h......h.",
      ".h......h.",
      "..h....h..",
    ],
    bald: [],
  };
  return styles[style] || styles.short;
}

/**
 * Generate a Stardew Valley-quality pixel art character sprite.
 */
export function generateSprite(args: GenerateSpriteArgs): string {
  const { output_path, name = "character", help, scale = 3 } = args;

  if (!output_path) throw new Error("output_path is required");

  if (help) {
    return [
      "Options for generate_sprite:",
      "",
      "Body type:  human, child, muscular, plump",
      "Hair:       short, long, twin_tail, ponytail, bob, bald",
      "Hair color: any hex or name (blonde, black, brown, silver, red, blue, pink)",
      "Skin:       any hex (try #F5E6D0, #D4A574, #C68E5B, #8D5524)",
      "Top:        shirt, jacket, vest, robe, armor",
      "Bottom:     pants, skirt, shorts",
      "Eye color:  any hex",
      "Headwear:   none, hat, ribbon, crown, glasses",
      "Hold:       none, sword, staff, book, flower",
      "Expression: neutral, happy, angry",
      "Bottom/top color, shoe color: any hex or name",
      "",
      "Example:",
      '  generate_sprite({ output_path: "assets/textures",',
      '    name: "heroine", body_type: "human",',
      '    hair: "long", hair_color: "silver",',
      '    top: "robe", top_color: "#1a1a2e", bottom: "skirt",',
      '    skin_color: "#F0E6D3", eye_color: "#FF0000",',
      '    shoe_color: "#111", hold: "staff" })',
    ].join("\n");
  }

  const buf = generateChar(args);
  const s = Math.max(2, Math.min(8, scale || 3));
  const svgW = buf.w * s;
  const svgH = buf.h * s;

  const svg: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
  ];

  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      const color = buf.pixels[y][x];
      if (!color) continue;
      svg.push(`<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" fill="${color}"/>`);
    }
  }

  svg.push(`</svg>`);

  if (!fs.existsSync(output_path)) fs.mkdirSync(output_path, { recursive: true });
  const outputFile = path.join(output_path, `${name}.svg`);
  fs.writeFileSync(outputFile, svg.join("\n"), "utf-8");

  return [
    `Generated: ${name}`,
    `  Size: ${svgW}x${svgH}px (${buf.w}x${buf.h} pixels × ${s})`,
    `  Hair: ${args.hair || "long"} | Top: ${args.top || "shirt"} | Bottom: ${args.bottom || "pants"}`,
    `  File: ${name}.svg`,
    ``,
    `In Godot: import_resource → Sprite2D → Filter: Nearest → scale up`,
  ].join("\n");
}
