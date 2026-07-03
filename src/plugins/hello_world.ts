// Example external generator plugin.
// Copy this file to src/plugins/ to register "hello_world" as a generate_game type.
// After placing it, call: generate_game({ type: "hello_world", project_path: "..." })
import type { GeneratorPlugin } from "../tools/plugin-registry.js";

export const plugin = {
  name: "hello_world",
  generate: ((args) => {
    const { project_path } = args;
    if (!project_path) throw new Error("project_path required");
    return `Hello from plugin! Project: ${project_path}\n\nTo use: this is a sample plugin. Replace this file with your own generator.`;
  }) as GeneratorPlugin,
};
