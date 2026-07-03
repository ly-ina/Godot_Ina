// Plugin loader — auto-discovers and registers external generators from src/plugins/
// Place any .ts file exporting a function matching GeneratorPlugin signature in src/plugins/.
// The file must export a `plugin` object with { name, generate } fields.
//
// Example plugin file (src/plugins/my_generator.ts):
//   import type { GeneratorPlugin } from "../tools/plugin-registry.js";
//   export const plugin = { name: "my_system", generate: ((args) => "...") as GeneratorPlugin };
import * as fs from "fs";
import * as path from "path";
import { PluginRegistry, type GeneratorPlugin } from "./tools/plugin-registry.js";

const PLUGINS_DIR = path.resolve(__dirname, "..", "plugins");

export interface PluginModule {
  name: string;
  generate: GeneratorPlugin;
}

/**
 * Scan the plugins directory and register all found plugins.
 * Call this once at server startup.
 */
export function loadPlugins(): string[] {
  const loaded: string[] = [];

  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    return loaded;
  }

  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".ts") || f.endsWith(".js"));

  for (const file of files) {
    try {
      const modPath = path.resolve(PLUGINS_DIR, file);
      // Dynamic import — only works in ESM context
      // In a CJS context, use require()
      const mod: PluginModule = require(modPath);
      if (mod && mod.name && mod.generate) {
        PluginRegistry.register(mod.name, mod.generate);
        loaded.push(mod.name);
        console.log(`[PluginLoader] Registered: ${mod.name} from ${file}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[PluginLoader] Failed to load ${file}: ${msg}`);
    }
  }

  return loaded;
}
