// Shared theme configuration for all game system generators.
// All generators should import colors/sizes from here for visual consistency.
// When generating .tscn files, use these values for block colors, player dimensions, etc.

// ── Block / Tile colors ──
export const BLOCK_COLORS: Record<string, [number, number, number]> = {
  GRASS:     [0.25, 0.65, 0.15],
  DIRT:      [0.50, 0.35, 0.20],
  STONE:     [0.45, 0.45, 0.45],
  COAL:      [0.25, 0.25, 0.25],
  IRON:      [0.80, 0.60, 0.40],
  GOLD:      [1.00, 0.75, 0.10],
  DIAMOND:   [0.30, 0.85, 1.00],
  WOOD:      [0.40, 0.25, 0.10],
  LEAVES:    [0.15, 0.55, 0.10],
  SAND:      [0.80, 0.75, 0.50],
  BEDROCK:   [0.30, 0.30, 0.30],
  WATER:     [0.20, 0.40, 0.70],
  LAVA:      [1.00, 0.30, 0.05],
};

// ── Player / Character dimensions ──
export const PLAYER = {
  BODY_WIDTH:    24,
  BODY_HEIGHT:   52,
  HEAD_WIDTH:    20,
  HEAD_HEIGHT:   13,
  BODY_COLOR:    [0.30, 0.50, 0.80] as [number, number, number],
  HEAD_COLOR:    [0.85, 0.70, 0.50] as [number, number, number],
  MOVE_SPEED:    150,
  JUMP_VELOCITY: -300,
  GRAVITY:       700,
  INTERACT_REACH: 80,
};

// ── World generation ──
export const WORLD = {
  TILE_SIZE:     16,
  DEFAULT_WIDTH: 300,
  DEFAULT_HEIGHT: 48,
  SURFACE_BASE:  28,
  SEED:          42,
};

// ── NPC ──
export const NPC = {
  BODY_WIDTH:    30,
  BODY_HEIGHT:   72,
  BODY_COLOR:    [0.30, 0.70, 0.30] as [number, number, number],
  HEAD_COLOR:    [0.90, 0.70, 0.50] as [number, number, number],
  PATROL_SPEED:  50,
  PATROL_RANGE:  120,
};

// ── UI / HUD ──
export const UI = {
  HOTBAR_SLOTS:     8,
  SLOT_SIZE:        36,
  BACKGROUND_ALPHA: 0.6,
  TEXT_COLOR:       [1, 1, 1] as [number, number, number],
};

// ── Sky colors ──
export const SKY = {
  DAY:    [0.50, 0.65, 0.85] as [number, number, number],
  NIGHT:  [0.08, 0.10, 0.18] as [number, number, number],
};

// ── Ground colors ──
export const GROUND = {
  GRASS:  [0.18, 0.38, 0.18] as [number, number, number],
  SAND:   [0.70, 0.55, 0.25] as [number, number, number],
  STONE:  [0.40, 0.40, 0.40] as [number, number, number],
};
