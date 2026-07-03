// Consolidated asset manager. Import, delete, list resources.
import { importResource } from "./impl/import_resource.js";
import { deleteResource } from "./impl/delete_resource.js";
import { deleteFile } from "./impl/delete_file.js";
import { listResources } from "./impl/list_resources.js";

export interface ManageAssetsArgs {
  /** Operation: import | delete_resource | delete_file | list */
  action: "import" | "delete_resource" | "delete_file" | "list";
  /** Path to Godot project root */
  project_path: string;
  /** Source file path (for import) */
  source_path?: string;
  /** Destination path in project (for import) */
  dest_path?: string;
  /** Resource path to delete (for delete_resource) */
  resource_path?: string;
  /** File path to delete (for delete_file) */
  file_path?: string;
}

export function manageAssets(args: ManageAssetsArgs): string {
  const { action, project_path, source_path, dest_path, resource_path, file_path } = args;
  if (!project_path) throw new Error("project_path is required");

  switch (action) {
    case "import":
      if (!source_path || !dest_path) throw new Error("source_path and dest_path required for import");
      return importResource({ project_path, source_path, dest_path } as any);

    case "delete_resource":
      if (!resource_path) throw new Error("resource_path required for delete_resource");
      return deleteResource({ project_path, resource_path } as any);

    case "delete_file":
      if (!file_path) throw new Error("file_path required for delete_file");
      return deleteFile({ project_path, file_path } as any);

    case "list":
      return listResources({ project_path } as any);

    default:
      throw new Error(`Unknown manage_assets action: ${action}`);
  }
}
