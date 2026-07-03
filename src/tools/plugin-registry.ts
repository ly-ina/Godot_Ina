// Plugin registry for external game system generators.
// Allows third-party code to add new `type` values to `generate_game`.
//
// Usage:
//   1. Create a .ts file that exports a function matching GeneratorPlugin signature
//   2. Register it: PluginRegistry.register("my_system", myGenerator)
//   3. Call via generate_game({ type: "my_system", ... })

import type { GenerateGameArgs } from "./generate_game.js";

export type GeneratorPlugin = (args: GenerateGameArgs) => string;

const _plugins: Map<string, GeneratorPlugin> = new Map();

export const PluginRegistry = {
  /** Register a custom generator for a given type name */
  register(type: string, generator: GeneratorPlugin): void {
    if (_plugins.has(type)) {
      console.warn(`[PluginRegistry] Overwriting existing plugin: ${type}`);
    }
    _plugins.set(type, generator);
  },

  /** Unregister a plugin */
  unregister(type: string): void {
    _plugins.delete(type);
  },

  /** Check if a plugin exists for type */
  has(type: string): boolean {
    return _plugins.has(type);
  },

  /** Execute a plugin by type. Returns null if not found. */
  execute(type: string, args: GenerateGameArgs): string | null {
    const fn = _plugins.get(type);
    return fn ? fn(args) : null;
  },

  /** List all registered plugin type names */
  list(): string[] {
    return Array.from(_plugins.keys());
  },
};
