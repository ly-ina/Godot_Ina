// Godot 4.x adapter — identity adapter (current behavior)
import type { GodotAdapter, GodotVersion } from "../types.js";

export const v4Adapter: GodotAdapter = {
  version: "4.x" as GodotVersion,

  toV4NodeType(type: string): string | null {
    return null; // Already v4
  },

  fromV4NodeType(type: string): string | null {
    return null; // Already v4
  },

  getSceneFormat(): number {
    return 3; // Godot 4.x uses format=3
  },

  translateCliArgs(args: string[]): string[] {
    return args; // No translation needed
  },

  needsGDScriptTranslation(): boolean {
    return false;
  },
};
