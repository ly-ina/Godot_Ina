// Shared types for Godot version adapters

/** Supported Godot engine versions */
export type GodotVersion = "4.x" | "3.x";

/** Adapter interface for version-specific behavior */
export interface GodotAdapter {
  /** The version this adapter targets */
  version: GodotVersion;

  /**
   * Translate a node type name from this version to Godot 4.x.
   * Returns null if the type doesn't need translation.
   */
  toV4NodeType(type: string): string | null;

  /**
   * Translate a Godot 4.x node type back to this version.
   * Returns null if the type doesn't exist in this version.
   */
  fromV4NodeType(type: string): string | null;

  /**
   * Get the .tscn format number for this version
   */
  getSceneFormat(): number;

  /**
   * Translate CLI arguments from this version to a format
   * compatible with the current parser/CLI layer.
   */
  translateCliArgs(args: string[]): string[];

  /**
   * Whether GDScript files need translation from 1.0 to 2.0 syntax
   */
  needsGDScriptTranslation(): boolean;
}

/** Node type mapping entry */
export interface NodeTypeMapping {
  v4: string;          // Godot 4.x type name
  v3: string | null;   // Godot 3.x type name (null if new in Godot 4)
  note?: string;       // Additional context
}

/** Property mapping entry */
export interface PropertyMapping {
  v4: string;
  v3: string;
  type?: string;
  note?: string;
}
