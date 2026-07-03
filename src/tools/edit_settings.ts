// Consolidated project settings. Read/write project.godot.
import { readProjectSettings } from "./impl/read_project_settings.js";
import { editProjectSettings } from "./impl/edit_project_settings.js";

export interface EditSettingsArgs {
  /** Operation: read | write */
  action: "read" | "write";
  /** Path to Godot project root */
  project_path: string;
  /** Key/path to setting (for write) */
  key?: string;
  /** Value to set (for write) */
  value?: string;
  /** Section (for write) */
  section?: string;
}

export function editSettings(args: EditSettingsArgs): string {
  const { action, project_path, key, value, section } = args;
  if (!project_path) throw new Error("project_path is required");

  switch (action) {
    case "read":
      return readProjectSettings({ project_path } as any);

    case "write":
      if (!key || value === undefined) throw new Error("key and value required for write");
      editProjectSettings({ project_path, key, value, section: section || "application" });
      return `Setting ${key} updated in ${project_path}`;

    default:
      throw new Error(`Unknown edit_settings action: ${action}`);
  }
}
