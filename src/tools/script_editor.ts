// Consolidated script editor. Dispatches to old edit_script tool.
import { editScript as oldEdit } from "./impl/edit_script_orig.js";
import { createScript } from "./impl/create_script.js";
import { readScript } from "./impl/read_script.js";
import { batchEditScript } from "./impl/batch_edit_script.js";

export interface EditScriptArgs {
  action: "create" | "read" | "edit" | "batch";
  project_path?: string;
  script_path?: string;
  content?: string;
  extends?: string;
  pattern?: string;
  replacement?: string;
  bind_scene?: string;
}

export function editScriptFn(args: EditScriptArgs): string {
  const { action, project_path, script_path, content, extends: ext, pattern, replacement, bind_scene } = args;

  switch (action) {
    case "create":
      if (!script_path || !content) throw new Error("script_path and content required for create");
      createScript({ script_path, extends: ext || "Node", content, bind_scene } as any);
      return `Script created: ${script_path}`;

    case "read":
      if (!script_path) throw new Error("script_path required for read");
      const result = readScript({ script_path } as any);
      return typeof result === "string" ? result : JSON.stringify(result, null, 2);

    case "edit":
      if (!script_path || !pattern || !replacement) throw new Error("script_path, pattern, replacement required for edit");
      return oldEdit({ script_path, replacements: [{ search: pattern, replace: replacement }] });

    case "batch":
      if (!project_path || !pattern || !replacement) throw new Error("project_path, pattern, replacement required for batch");
      return batchEditScript({ project_path, search_pattern: pattern, replace_text: replacement } as any);

    default:
      throw new Error(`Unknown edit_script action: ${action}`);
  }
}
