// Godot 3.x adapter
import type { GodotAdapter, GodotVersion } from "../types.js";
import { V3_TO_V4, V4_TO_V3 } from "./mappings.js";

export const v3Adapter: GodotAdapter = {
  version: "3.x" as GodotVersion,

  toV4NodeType(type: string): string | null {
    return V3_TO_V4[type] || null;
  },

  fromV4NodeType(type: string): string | null {
    return V4_TO_V3[type] || null;
  },

  getSceneFormat(): number {
    return 2; // Godot 3.x uses format=2
  },

  translateCliArgs(args: string[]): string[] {
    // Godot 3.x uses slightly different CLI flags
    return args.map((arg) => {
      if (arg === "--headless") return "--no-window"; // Godot 3.x equivalent
      return arg;
    });
  },

  needsGDScriptTranslation(): boolean {
    return true;
  },
};
