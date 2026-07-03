// Consolidated project analysis. Dispatches to original tools.
import { searchNodes } from "./impl/search_nodes.js";
import { findReferences } from "./impl/find_references.js";
import { validateProject } from "./impl/validate_project.js";
import { analyzeProject } from "./impl/analyze_project.js";
import { listScenes } from "./impl/list_scenes.js";

export interface AnalyzeArgs {
  action: "search_nodes" | "find_refs" | "validate" | "analyze" | "list_scenes";
  project_path?: string;
  node_type?: string;
  node_name?: string;
  properties?: string;
  resource_path?: string;
  scene_path?: string;
}

export function analyzeProjectFn(args: AnalyzeArgs): string {
  const { action, project_path, node_type, node_name, properties, resource_path, scene_path } = args;
  if (!project_path) throw new Error("project_path is required");

  switch (action) {
    case "search_nodes":
      return searchNodes({ project_path, node_type, node_name: node_name, properties: properties ? JSON.parse(properties) : undefined } as any);

    case "find_refs":
      if (!resource_path) throw new Error("resource_path required for find_refs");
      return findReferences({ project_path, resource_path } as any);

    case "validate":
      return validateProject({ project_path, scene_path } as any);

    case "analyze":
      return analyzeProject(project_path as any);

    case "list_scenes":
      return listScenes(project_path).map(s => `${s.path}`).join("\n");

    default:
      throw new Error(`Unknown analyze action: ${action}`);
  }
}
